import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

const { mockPut, mockQuery, mockUpdate } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockQuery: vi.fn(),
  mockUpdate: vi.fn(),
}));

// Mock DynamoDB
vi.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: class MockClient {},
  };
});

vi.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    PutCommand: class MockPut {},
    QueryCommand: class MockQuery {},
    UpdateCommand: class MockUpdate {},
    DynamoDBDocument: {
      from: vi.fn().mockImplementation(() => ({
        put: mockPut,
        query: mockQuery,
        update: mockUpdate,
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

// Mock email helper
vi.mock('../../../../lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({}),
}));

// Mock DB helper
vi.mock('../../../../lib/db', () => ({
  docClient: {
    send: vi.fn().mockResolvedValue({}),
  },
}));

describe('Registration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DYNAMO_TABLE = 'TestTable';
  });

  it('should store user with plan=MANAGED when provided', async () => {
    mockQuery.mockResolvedValue({ Items: [] }); // User doesn't exist
    mockPut.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'managed@example.com',
        name: 'Jane Managed',
        plan: 'managed',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify DynamoDB Put call
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        Item: expect.objectContaining({
          email: 'managed@example.com',
          plan: 'MANAGED',
          status: 'PENDING',
        }),
      })
    );
  });

  it('should store default plan=FREE when not provided', async () => {
    mockQuery.mockResolvedValue({ Items: [] });
    mockPut.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'free@example.com',
        name: 'John Free',
      }),
    });

    await POST(req);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        Item: expect.objectContaining({
          email: 'free@example.com',
          plan: 'FREE',
        }),
      })
    );
  });
});
