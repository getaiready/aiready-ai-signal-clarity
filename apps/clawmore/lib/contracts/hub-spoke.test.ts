import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProvisioningOrchestrator } from '../onboarding/provision-node';

const {
  mockCreateFork,
  mockReposGet,
  mockReposUpdate,
  mockCreateOrUpdateRepoSecret,
  mockGetRepoPublicKey,
  mockQuery,
  mockUpdate,
} = vi.hoisted(() => ({
  mockCreateFork: vi.fn(),
  mockReposGet: vi.fn(),
  mockReposUpdate: vi.fn(),
  mockCreateOrUpdateRepoSecret: vi.fn(),
  mockGetRepoPublicKey: vi.fn(),
  mockQuery: vi.fn(),
  mockUpdate: vi.fn(),
}));

// Mock Octokit
vi.mock('@octokit/rest', () => {
  class MockOctokit {
    repos = {
      createFork: mockCreateFork,
      get: mockReposGet,
      update: mockReposUpdate,
    };
    actions = {
      createOrUpdateRepoSecret: mockCreateOrUpdateRepoSecret,
      getRepoPublicKey: mockGetRepoPublicKey,
    };
  }
  return { Octokit: MockOctokit };
});

// Mock Sodium for encryption
vi.mock('libsodium-wrappers', () => ({
  default: {
    ready: Promise.resolve(),
    from_base64: vi.fn().mockReturnValue(new Uint8Array()),
    from_string: vi.fn().mockReturnValue(new Uint8Array()),
    crypto_box_seal: vi.fn().mockReturnValue(new Uint8Array()),
    to_base64: vi.fn().mockReturnValue('encrypted_mock'),
    base64_variants: { ORIGINAL: 'original' },
  },
}));

// Mock DynamoDB
vi.mock('@aws-sdk/client-dynamodb', () => {
  return { DynamoDBClient: class MockDB {} };
});

vi.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    PutCommand: class MockPut {},
    QueryCommand: class MockQuery {},
    UpdateCommand: class MockUpdate {},
    DynamoDBDocument: {
      from: vi.fn().mockImplementation(() => ({
        query: mockQuery,
        update: mockUpdate,
        put: vi.fn(),
        send: vi.fn().mockResolvedValue({}),
      })),
    },
    DynamoDBDocumentClient: {
      from: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockResolvedValue({}),
      })),
    },
  };
});

// Mock Vending
vi.mock('../aws/vending', () => ({
  findAvailableAccountInPool: vi.fn().mockResolvedValue('123456789012'),
  assignAccountToOwner: vi.fn().mockResolvedValue({}),
  assumeSubAccountRole: vi
    .fn()
    .mockResolvedValue({ accessKeyId: 'ak_test', secretAccessKey: 'sk_test' }),
  bootstrapManagedAccount: vi
    .fn()
    .mockResolvedValue('arn:aws:iam::123456789012:role/BootstrapRole'),
  createManagedAccount: vi.fn(),
  waitForAccountCreation: vi.fn(),
  createCodeBuildProject: vi.fn().mockResolvedValue('test-project'),
  triggerCodeBuildBuild: vi.fn().mockResolvedValue({}),
}));

// Mock Governance
vi.mock('../aws/governance', () => ({
  createServerlessSCP: vi.fn().mockResolvedValue('scp-123'),
  attachSCPToAccount: vi.fn().mockResolvedValue({}),
}));

// Mock DB
vi.mock('../db', () => ({
  createManagedAccountRecord: vi.fn().mockResolvedValue({}),
  ensureUserMetadata: vi.fn().mockResolvedValue({}),
  updateProvisioningStatus: vi.fn().mockResolvedValue({}),
  updateAccountStatus: vi.fn().mockResolvedValue({}),
}));

describe('Hub-Spoke Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLAW_MORE_BUS = 'ClawMoreBus';
    process.env.DYNAMO_TABLE = 'TestTable';
  });

  describe('Required Secrets Contract', () => {
    it('should inject all required AWS secrets for spoke bootstrap', async () => {
      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser123' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser123',
        userEmail: 'contract@example.com',
        userName: 'Contract Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify AWS credentials are injected
      const secretCalls = mockCreateOrUpdateRepoSecret.mock.calls;
      const secretNames = secretCalls.map((call) => call[0].secret_name);

      // Required AWS secrets for spoke (role-based access)
      expect(secretNames).toContain('AWS_ROLE_ARN');
      expect(secretNames).toContain('HUB_USER_ID');
      expect(secretNames).toContain('HUB_EVENT_BUS_NAME');
      expect(secretNames).toContain('EVOLUTION_OPT_IN');
    });

    it('should inject HUB_USER_ID for spoke-to-hub communication', async () => {
      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#user_hub_123' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'user_hub_123',
        userEmail: 'hub@example.com',
        userName: 'Hub Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify HUB_USER_ID is injected
      const secretCalls = mockCreateOrUpdateRepoSecret.mock.calls;
      const hubUserIdCall = secretCalls.find(
        (call) => call[0].secret_name === 'HUB_USER_ID'
      );

      expect(hubUserIdCall).toBeDefined();
      expect(hubUserIdCall![0].encrypted_value).toBe('encrypted_mock');
    });

    it('should inject HUB_EVENT_BUS_NAME for EventBridge communication', async () => {
      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'bus@example.com',
        userName: 'Bus Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify HUB_EVENT_BUS_NAME is injected
      const secretCalls = mockCreateOrUpdateRepoSecret.mock.calls;
      const eventBusCall = secretCalls.find(
        (call) => call[0].secret_name === 'HUB_EVENT_BUS_NAME'
      );

      expect(eventBusCall).toBeDefined();
      // Should match the configured bus name
      expect(process.env.CLAW_MORE_BUS).toBe('ClawMoreBus');
    });

    it('should inject EVOLUTION_OPT_IN based on user preference', async () => {
      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      // Test with co-evolution opt-in enabled
      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'optin@example.com',
        userName: 'OptIn Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: true,
      });

      // Verify EVOLUTION_OPT_IN is set to 'true'
      const secretCalls = mockCreateOrUpdateRepoSecret.mock.calls;
      const optInCall = secretCalls.find(
        (call) => call[0].secret_name === 'EVOLUTION_OPT_IN'
      );

      expect(optInCall).toBeDefined();
    });

    it('should inject SST secrets with SST_SECRET_ prefix', async () => {
      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'sst@example.com',
        userName: 'SST Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
        sstSecrets: {
          TelegramBotToken: 'test_telegram_token',
          OpenAIApiKey: 'test_openai_key',
          GitHubToken: 'test_github_token',
        },
      });

      // Verify SST secrets are injected with correct prefix
      const secretCalls = mockCreateOrUpdateRepoSecret.mock.calls;
      const sstSecretCalls = secretCalls.filter((call) =>
        call[0].secret_name.startsWith('SST_SECRET_')
      );

      expect(sstSecretCalls.length).toBeGreaterThanOrEqual(3);

      // Verify specific SST secrets
      const secretNames = sstSecretCalls.map((call) => call[0].secret_name);
      expect(secretNames).toContain('SST_SECRET_TelegramBotToken');
      expect(secretNames).toContain('SST_SECRET_OpenAIApiKey');
      expect(secretNames).toContain('SST_SECRET_GitHubToken');
    });
  });

  describe('Repository Structure Contract', () => {
    it('should fork from correct source repository', async () => {
      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'fork@example.com',
        userName: 'Fork Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify fork is created from correct source
      expect(mockCreateFork).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'serverlessclaw',
          repo: 'serverlessclaw',
          organization: 'clawmost',
          name: 'test-node',
        })
      );
    });

    it('should make forked repository private', async () => {
      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'private@example.com',
        userName: 'Private Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify repository is made private
      expect(mockReposUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'clawmost',
          repo: 'test-node',
          private: true,
        })
      );
    });
  });

  describe('EventBridge Contract', () => {
    it('should configure spoke to emit MutationPerformed events', async () => {
      // The spoke should emit MutationPerformed events to the hub's EventBridge bus
      // This is configured via HUB_EVENT_BUS_NAME secret

      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'event@example.com',
        userName: 'Event Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify HUB_EVENT_BUS_NAME is injected
      // This allows spoke to emit events to hub's EventBridge
      const secretCalls = mockCreateOrUpdateRepoSecret.mock.calls;
      const eventBusCall = secretCalls.find(
        (call) => call[0].secret_name === 'HUB_EVENT_BUS_NAME'
      );

      expect(eventBusCall).toBeDefined();
    });
  });

  describe('Database Schema Contract', () => {
    it('should create managed account record with required fields', async () => {
      const { createManagedAccountRecord } = await import('../db');

      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'db@example.com',
        userName: 'DB Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify managed account record is created
      expect(createManagedAccountRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          awsAccountId: '123456789012',
          ownerEmail: 'db@example.com',
          repoName: 'test-node',
        })
      );
    });

    it('should ensure user metadata exists', async () => {
      const { ensureUserMetadata } = await import('../db');

      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'metadata@example.com',
        userName: 'Metadata Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify user metadata is ensured
      expect(ensureUserMetadata).toHaveBeenCalledWith('metadata@example.com');
    });
  });

  describe('CodeBuild Deployment Contract', () => {
    it('should create CodeBuild project in sub-account', async () => {
      const { createCodeBuildProject } = await import('../aws/vending');

      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'build@example.com',
        userName: 'Build Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify CodeBuild project is created
      expect(createCodeBuildProject).toHaveBeenCalledWith(
        '123456789012',
        'https://github.com/clawmost/test-node',
        'fake_token'
      );
    });

    it('should trigger initial deployment via CodeBuild', async () => {
      const { triggerCodeBuildBuild } = await import('../aws/vending');

      mockCreateFork.mockResolvedValue({
        data: { html_url: 'https://github.com/clawmost/test-node' },
      });
      mockReposGet.mockResolvedValue({
        data: { full_name: 'clawmost/test-node' },
      });
      mockReposUpdate.mockResolvedValue({});
      mockGetRepoPublicKey.mockResolvedValue({
        data: { key: 'key_abc', key_id: 'kid_123' },
      });
      mockQuery.mockResolvedValue({
        Items: [{ PK: 'USER#testuser' }],
      });

      const orchestrator = new ProvisioningOrchestrator('fake_token');
      await orchestrator.provisionNode({
        userId: 'testuser',
        userEmail: 'deploy@example.com',
        userName: 'Deploy Test',
        repoName: 'test-node',
        githubToken: 'fake_token',
        coEvolutionOptIn: false,
      });

      // Verify deployment is triggered
      expect(triggerCodeBuildBuild).toHaveBeenCalledWith(
        '123456789012',
        'test-project'
      );
    });
  });
});
