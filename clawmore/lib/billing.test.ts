import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPlatformSubscriptionSession } from './billing';

const { mockCreateSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
}));

// Mock sst/Resource
vi.mock('sst', () => ({
  Resource: {
    PlatformPrice: { id: 'price_platform_123' },
    ProPrice: { id: 'price_pro_456' },
    TeamPrice: { id: 'price_team_789' },
    MutationTaxPrice: { id: 'price_mutation_tax_999' },
  },
}));

// Mock Stripe correctly as a constructor
vi.mock('stripe', () => {
  class MockStripe {
    checkout = {
      sessions: {
        create: mockCreateSession,
      },
    };
  }
  return {
    default: MockStripe,
  };
});

describe('Billing Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPlatformSubscriptionSession should include MutationTaxPrice in line_items', async () => {
    mockCreateSession.mockResolvedValue({
      id: 'sess_123',
      url: 'https://stripe.com/sess_123',
    });

    await createPlatformSubscriptionSession({
      userId: 'user_123',
      userEmail: 'test@example.com',
      tier: 'starter',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({ price: 'price_platform_123', quantity: 1 }),
          expect.objectContaining({ price: 'price_mutation_tax_999' }),
        ]),
        metadata: expect.objectContaining({
          type: 'platform_subscription',
          userEmail: 'test@example.com',
        }),
      })
    );
  });

  it('should use ProPrice by default if no tier specified', async () => {
    mockCreateSession.mockResolvedValue({
      id: 'sess_pro',
      url: 'https://stripe.com/sess_pro',
    });

    await createPlatformSubscriptionSession({
      userId: 'user_456',
      userEmail: 'pro@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({ price: 'price_pro_456', quantity: 1 }),
        ]),
      })
    );
  });
});
