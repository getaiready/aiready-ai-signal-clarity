import { Octokit } from '@octokit/rest';
import sodium from 'libsodium-wrappers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import {
  createManagedAccount,
  waitForAccountCreation,
  bootstrapManagedAccount,
  findAvailableAccountInPool,
  assignAccountToOwner,
} from '../aws/vending';
import { createServerlessSCP, attachSCPToAccount } from '../aws/governance';
import {
  createManagedAccountRecord,
  ensureUserMetadata,
  updateProvisioningStatus,
} from '../db';
import { Resource } from 'sst';

const dbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});
const docClient = DynamoDBDocument.from(dbClient);

export interface ProvisioningOptions {
  userEmail: string;
  userId: string;
  userName: string;
  githubToken: string;
  repoName: string;
  coEvolutionOptIn: boolean; // TRUE = Free Mutations, FALSE = $1.00 Tax
  sstSecrets?: Record<string, string>; // SST secrets to inject into the spoke
}

export class ProvisioningOrchestrator {
  private octokit: Octokit;

  constructor(githubToken: string, octokit?: Octokit) {
    this.octokit = octokit || new Octokit({ auth: githubToken });
  }

  /**
   * Performs the full one-click deployment using the "Warm Pool" strategy:
   * 1. Find/Create AWS Account
   * 2. Provision Private GitHub Repo in 'clawmost' org
   * 3. Inject AWS Secrets and Setup Mutation Tax Preference
   */
  public async provisionNode(options: ProvisioningOptions) {
    const {
      userEmail,
      userId: _userId,
      userName,
      repoName,
      coEvolutionOptIn,
    } = options;
    const githubOrg = 'clawmost';
    let accountId: string | null = null;

    try {
      console.log(
        `[Provision] Starting for ${userEmail} (Opt-in: ${coEvolutionOptIn})...`
      );

      // 1. AWS Account Management (Warm Pool Pattern)
      accountId = await findAvailableAccountInPool();

      if (accountId) {
        console.log(`[Provision] Found warm account ${accountId} in pool.`);
        await assignAccountToOwner(accountId, userEmail, repoName);
        // Replenish pool asynchronously — create a new warm account
        this.replenishWarmPool().catch((err) =>
          console.error('[Provision] Failed to replenish warm pool:', err)
        );
      } else {
        console.log(`[Provision] Pool empty. Creating new account...`);
        const { requestId } = await createManagedAccount(
          userEmail,
          userName,
          _userId
        );
        accountId = await waitForAccountCreation(requestId);
      }

      // Mark provisioning as in-progress
      await updateProvisioningStatus(accountId, 'provisioning');

      // 2. AWS Governance & Bootstrapping
      const scpId = await createServerlessSCP();
      await attachSCPToAccount(scpId, accountId);
      const bootstrapRoleArn = await bootstrapManagedAccount(
        accountId,
        githubOrg,
        repoName
      );

      // 3. GitHub Provisioning — Fork from serverlessclaw into 'clawmost' org
      console.log(
        `[Provision] Forking serverlessclaw into ${githubOrg}/${repoName}...`
      );
      const forkResponse = await this.octokit.repos.createFork({
        owner: 'serverlessclaw',
        repo: 'serverlessclaw',
        organization: githubOrg,
        name: repoName,
      });

      // Wait for fork to be ready (GitHub forks are async)
      console.log(`[Provision] Waiting for fork to be ready...`);
      const repoUrl = forkResponse.data.html_url;
      await this.waitForRepoReady(githubOrg, repoName);

      // Make fork private
      console.log(`[Provision] Making fork private...`);
      await this.octokit.repos.update({
        owner: githubOrg,
        repo: repoName,
        private: true,
      });

      await this.injectSecret(
        githubOrg,
        repoName,
        'AWS_ROLE_ARN',
        bootstrapRoleArn
      );
      // Find the user ID for this email to inject it

      const userRes = await docClient.query({
        TableName: process.env.DYNAMO_TABLE || '',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: {
          ':pk': 'USER',
          ':sk': userEmail,
        },
      });
      const resolvedUserId =
        userRes.Items?.[0]?.PK.replace('USER#', '') || _userId || 'unknown';

      await this.injectSecret(
        githubOrg,
        repoName,
        'EVOLUTION_OPT_IN',
        coEvolutionOptIn ? 'true' : 'false'
      );
      await this.injectSecret(
        githubOrg,
        repoName,
        'HUB_USER_ID',
        resolvedUserId
      );
      await this.injectSecret(
        githubOrg,
        repoName,
        'HUB_EVENT_BUS_NAME',
        Resource.ClawMoreBus.name
      );

      // 5. SST Secret Injection (for spoke stack to boot)
      if (options.sstSecrets && Object.keys(options.sstSecrets).length > 0) {
        console.log(`[Provision] Injecting SST secrets into spoke...`);
        const secretEntries = Object.entries(options.sstSecrets);
        for (const [secretName, secretValue] of secretEntries) {
          if (secretValue) {
            await this.octokit.actions.createOrUpdateRepoSecret({
              owner: githubOrg,
              repo: repoName,
              secret_name: `SST_SECRET_${secretName}`,
              encrypted_value: await this.encryptSecret(
                githubOrg,
                repoName,
                secretValue
              ),
              key_id: (
                await this.octokit.actions.getRepoPublicKey({
                  owner: githubOrg,
                  repo: repoName,
                })
              ).data.key_id,
            });
            console.log(`[Provision] SST secret ${secretName} injected.`);
          }
        }
      }

      // 6. Trigger Initial Deployment (via AWS CodeBuild)
      console.log(
        `[Provision] Provisioning CodeBuild project in sub-account...`
      );
      try {
        const { createCodeBuildProject, triggerCodeBuildBuild } =
          await import('../aws/vending');
        const projectName = await createCodeBuildProject(
          accountId,
          repoUrl,
          options.githubToken
        );

        console.log(
          `[Provision] Triggering initial deployment via CodeBuild...`
        );
        await triggerCodeBuildBuild(accountId, projectName);
        console.log(`[Provision] CodeBuild deployment triggered successfully.`);
      } catch (triggerErr: any) {
        console.error(
          `[Provision] Failed to trigger CodeBuild deployment:`,
          triggerErr.message
        );
      }

      // Mark account as pending deployment in DynamoDB
      const { updateAccountStatus } = await import('../db');
      await updateAccountStatus(accountId, 'PENDING_DEPLOY');

      // 7. DynamoDB Persistence (Crucial for Dashboard and Billing)
      console.log(`[Provision] Recording managed account in DynamoDB...`);
      await createManagedAccountRecord({
        awsAccountId: accountId,
        ownerEmail: userEmail,
        repoName,
      });

      // Ensure user has metadata (for credits and global settings)
      await ensureUserMetadata(userEmail);

      // Mark provisioning as complete (this state now includes vended + triggered deploy)
      await updateProvisioningStatus(accountId, 'complete', undefined, repoUrl);

      console.log(
        `[Provision] Node successfully vended under ${githubOrg} org!`
      );
      return {
        accountId,
        repoUrl,
        roleArn: bootstrapRoleArn,
        org: githubOrg,
      };
    } catch (err: any) {
      console.error(`[Provision] FAILED for ${userEmail}:`, err);
      if (accountId) {
        await updateProvisioningStatus(
          accountId,
          'failed',
          err.message || 'Unknown error'
        ).catch(console.error);
      }
      throw err;
    }
  }

  private async injectSecret(
    owner: string,
    repo: string,
    name: string,
    value: string
  ) {
    const encryptedValue = await this.encryptSecret(owner, repo, value);
    const { data: publicKey } = await this.octokit.actions.getRepoPublicKey({
      owner,
      repo,
    });

    await this.octokit.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: name,
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    });
  }

  /**
   * Polls until the forked repo is available.
   * GitHub forks are async and may take a few seconds.
   */
  private async waitForRepoReady(
    owner: string,
    repo: string,
    maxRetries = 30,
    delayMs = 2000
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.octokit.repos.get({ owner, repo });
        console.log(`[Provision] Repo ${owner}/${repo} is ready.`);
        return;
      } catch {
        if (i < maxRetries - 1) {
          console.log(
            `[Provision] Repo not ready yet, retrying in ${delayMs}ms... (${i + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw new Error(
      `Fork ${owner}/${repo} did not become available after ${maxRetries} retries`
    );
  }

  /**
   * Asynchronously creates a new warm pool account to replace the one just taken.
   * This ensures the pool is always ready for the next client.
   */
  private async replenishWarmPool(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'caodanju@gmail.com';
    console.log('[Provision] Replenishing warm pool...');
    try {
      const { requestId } = await createManagedAccount(
        adminEmail,
        'WarmPool',
        undefined,
        true
      );
      const newAccountId = await waitForAccountCreation(requestId);
      console.log(
        `[Provision] Warm pool replenished: ${newAccountId} is now available.`
      );
    } catch (err) {
      console.error('[Provision] Warm pool replenishment failed:', err);
    }
  }

  private async encryptSecret(
    owner: string,
    repo: string,
    value: string
  ): Promise<string> {
    await sodium.ready;
    const { data: publicKey } = await this.octokit.actions.getRepoPublicKey({
      owner,
      repo,
    });

    const binKey = sodium.from_base64(
      publicKey.key,
      sodium.base64_variants.ORIGINAL
    );
    const binSec = sodium.from_string(value);
    const encBytes = sodium.crypto_box_seal(binSec, binKey);
    return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
  }
}
