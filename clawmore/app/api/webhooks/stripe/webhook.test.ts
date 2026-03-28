import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

const {
  mockRetrieveSubscription,
  mockConstructEvent,
  mockUpdate,
  mockQuery,
  mockProvisionNode,
} = vi.hoisted(() => ({
  mockRetrieveSubscription: vi.fn(),
  mockConstructEvent: vi.fn(),
  mockUpdate: vi.fn(),
  mockQuery: vi.fn(),
  mockProvisionNode: vi.fn().mockResolvedValue({
    accountId: '123456789012',
    repoUrl: 'https://github.com/clawmost/test',
  }),
}));

// Mock Stripe correctly as a constructor
vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: mockConstructEvent };
    subscriptions = { retrieve: mockRetrieveSubscription };
  }
  return { default: MockStripe };
});

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
        update: mockUpdate,
        query: mockQuery,
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

// Mock ProvisioningOrchestrator as a constructor
vi.mock('../../../../lib/onboarding/provision-node', () => {
  class MockOrchestrator {
    provisionNode = mockProvisionNode;
  }
  return { ProvisioningOrchestrator: MockOrchestrator };
});

describe('Stripe Webhook Orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    process.env.DYNAMO_TABLE = 'TestTable';
    process.env.GITHUB_SERVICE_TOKEN = 'ghp_test';
  });

  it('should identify MutationTax item and trigger provisioning on checkout.session.completed', async () => {
    // 1. Mock Stripe Webhook Event
    const mockSession = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: {
            type: 'platform_subscription',
            userEmail: 'pay@example.com',
            userName: 'Payer',
            repoName: 'payer-repo',
            coEvolutionOptIn: 'false',
          },
        },
      },
    };
    mockConstructEvent.mockReturnValue(mockSession);

    // 2. Mock Subscription Items
    mockRetrieveSubscription.mockResolvedValue({
      id: 'sub_123',
      items: {
        data: [
          { id: 'si_base', price: { unit_amount: 2900 } },
          {
            id: 'si_mutation_tax',
            price: { unit_amount: 100, recurring: { usage_type: 'metered' } },
          },
        ],
      },
    });

    // 3. Mock User Lookup in DB
    mockQuery.mockResolvedValue({
      Items: [{ PK: 'USER#testuser', email: 'pay@example.com' }],
    });

    mockUpdate.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=abc',
      },
      body: JSON.stringify(mockSession),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // 4. Verify DB storage of metered item ID
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: expect.objectContaining({ SK: 'METADATA' }),
        UpdateExpression: expect.stringContaining(
          'stripeMutationSubscriptionItemId = :mutationItemId'
        ),
        ExpressionAttributeValues: expect.objectContaining({
          ':mutationItemId': 'si_mutation_tax',
        }),
      })
    );

    // 5. Verify Orchestrator Trigger
    expect(mockProvisionNode).toHaveBeenCalled();
  });
});
