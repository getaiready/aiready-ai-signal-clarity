import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { sendWelcomeEmail } from '../../../../lib/email';
import { createLogger } from '../../../../lib/logger';

const log = createLogger('register');

const dbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});
const docClient = DynamoDBDocument.from(dbClient);
const TableName = process.env.DYNAMO_TABLE || '';

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required').max(100),
  plan: z.enum(['free', 'managed']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!TableName) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, name, plan = 'free' } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await docClient.query({
      TableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'USER',
        ':sk': normalizedEmail,
      },
    });

    if (existing.Items && existing.Items.length > 0) {
      const existingUser = existing.Items[0];
      const existingId = existingUser.PK.replace('USER#', '');

      // Update record with plan choice if it's a pending user
      await docClient.update({
        TableName,
        Key: { PK: `USER#${existingId}`, SK: `USER#${existingId}` },
        UpdateExpression: 'SET #n = :name, plan = :plan, updatedAt = :now',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: {
          ':name': name,
          ':plan': plan.toUpperCase(),
          ':now': new Date().toISOString(),
        },
      });

      if (existingUser.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'Account already exists. Please sign in.' },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Account found. Please sign in to continue.',
        userId: existingId,
      });
    }

    // Generate user ID
    const id = Buffer.from(normalizedEmail)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);

    const now = new Date().toISOString();

    // Create user record with PENDING status
    await docClient.put({
      TableName,
      Item: {
        PK: `USER#${id}`,
        SK: `USER#${id}`,
        GSI1PK: 'USER',
        GSI1SK: normalizedEmail,
        id,
        email: normalizedEmail,
        name,
        status: 'PENDING',
        plan: plan.toUpperCase(),
        type: 'USER',
        createdAt: now,
        updatedAt: now,
      },
    });

    // Create user metadata with initial credits
    await docClient.put({
      TableName,
      Item: {
        PK: `USER#${id}`,
        SK: 'METADATA',
        EntityType: 'UserMetadata',
        aiTokenBalanceCents: 500,
        aiRefillThresholdCents: 100,
        aiTopupAmountCents: 1000,
        coEvolutionOptIn: false,
        autoTopupEnabled: true,
        createdAt: now,
      },
    });

    // Send welcome email (don't block the response)
    sendWelcomeEmail(normalizedEmail, name).catch((err) =>
      log.error({ err, email: normalizedEmail }, 'Failed to send welcome email')
    );

    log.info({ userId: id, email: normalizedEmail }, 'User registered');

    return NextResponse.json({
      success: true,
      message: 'Account created. Proceed to checkout.',
      userId: id,
    });
  } catch (error: any) {
    log.error({ err: error }, 'Registration failed');
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
