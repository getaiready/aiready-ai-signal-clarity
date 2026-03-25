import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import Stripe from 'stripe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});
const docClient = DynamoDBDocument.from(dbClient);
const TableName = process.env.DYNAMO_TABLE || '';

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27-acacia' as any,
    });

    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lookup Stripe Customer ID from DynamoDB
    const { Items } = await docClient.query({
      TableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: { ':email': `USER#${session.user.email}` },
    });

    const stripeCustomerId = Items?.[0]?.stripeCustomerId || 'cus_placeholder'; // fallback for demo

    if (
      stripeCustomerId === 'cus_placeholder' &&
      process.env.NODE_ENV === 'production'
    ) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
    }

    const host =
      process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;

    // Create a Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${host}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating customer portal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
