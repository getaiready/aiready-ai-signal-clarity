import {
  createManagedAccount,
  waitForAccountCreation,
  bootstrapManagedAccount,
} from '../lib/aws/vending';
import { createServerlessSCP, attachSCPToAccount } from '../lib/aws/governance';

/**
 * Script to pre-provision a "Warm Pool" of AWS accounts for ClawMore.
 * Run this periodically to ensure new users have a sub-minute setup experience.
 */
async function warmPool(targetSize: number = 3) {
  console.log(`[WarmPool] Checking pool status (Target: ${targetSize})...`);

  const adminEmail = process.env.ADMIN_EMAIL || 'caopengau@gmail.com';

  // 1. Check existing pool
  // For a robust script, we'd list all accounts and filter by tag.
  // But let's assume we want to add one if the pool needs warming.

  for (let i = 0; i < targetSize; i++) {
    console.log(`[WarmPool] Provisioning account ${i + 1}/${targetSize}...`);

    try {
      const requestId = await createManagedAccount(
        adminEmail,
        'WarmPool',
        undefined,
        true
      );
      console.log(`[WarmPool] Request ${requestId} initiated. Waiting...`);

      const accountId = await waitForAccountCreation(requestId);
      console.log(`[WarmPool] Account ${accountId} created. Bootstrapping...`);

      // Bootstrap with SCPs
      const scpId = await createServerlessSCP();
      await attachSCPToAccount(scpId, accountId);

      // Bootstrap with IAM roles
      await bootstrapManagedAccount(accountId);

      console.log(`[WarmPool] Account ${accountId} is now WARM and READY.`);
    } catch (err) {
      console.error(`[WarmPool] Failed to warm account:`, err);
    }
  }
}

// Get target size from CLI arg
const size = parseInt(process.argv[2] || '3', 10);
warmPool(size).then(() => console.log('[WarmPool] Finished.'));
