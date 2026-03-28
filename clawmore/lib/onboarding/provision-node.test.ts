import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProvisioningOrchestrator } from './provision-node';

const {
  mockCreateUsingTemplate,
  mockCreateOrUpdateRepoSecret,
  mockGetRepoPublicKey,
  mockQuery,
  mockUpdate,
} = vi.hoisted(() => ({
  mockCreateUsingTemplate: vi.fn(),
  mockCreateOrUpdateRepoSecret: vi.fn(),
  mockGetRepoPublicKey: vi.fn(),
  mockQuery: vi.fn(),
  mockUpdate: vi.fn(),
}));

// Mock Octokit
vi.mock('@octokit/rest', () => {
  class MockOctokit {
    repos = { createUsingTemplate: mockCreateUsingTemplate };
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
    .mockResolvedValue({ accessKeyId: 'ak', secretAccessKey: 'sk' }),
  bootstrapManagedAccount: vi
    .fn()
    .mockResolvedValue('arn:aws:iam::123456789012:role/Role'),
  createManagedAccount: vi.fn(),
  waitForAccountCreation: vi.fn(),
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
}));

describe('Provisioning Secret Injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLAW_MORE_BUS = 'ClawMoreBus';
  });

  it('should inject HUB_USER_ID and HUB_EVENT_BUS_NAME secrets', async () => {
    mockCreateUsingTemplate.mockResolvedValue({
      data: { html_url: 'https://github.com/ok' },
    });
    mockGetRepoPublicKey.mockResolvedValue({
      data: { key: 'key_abc', key_id: 'kid_123' },
    });

    // Mock User Lookup
    mockQuery.mockResolvedValue({
      Items: [{ PK: 'USER#testuser123' }],
    });

    const orchestrator = new ProvisioningOrchestrator('fake_token');
    await orchestrator.provisionNode({
      userId: 'testuser123',
      userEmail: 'test@example.com',
      userName: 'Tester',
      repoName: 'test-node',
      githubToken: 'fake_token',
      coEvolutionOptIn: false,
    });

    // Verify Secret Injection
    expect(mockCreateOrUpdateRepoSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        secret_name: 'HUB_USER_ID',
        encrypted_value: 'encrypted_mock',
      })
    );

    expect(mockCreateOrUpdateRepoSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        secret_name: 'HUB_EVENT_BUS_NAME',
        encrypted_value: 'encrypted_mock',
      })
    );
  });
});
