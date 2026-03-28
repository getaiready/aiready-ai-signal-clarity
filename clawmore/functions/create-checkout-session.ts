import { createPlatformSubscriptionSession } from '../lib/billing';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: any) => {
  const { userId, userEmail, coEvolutionOptIn, successUrl, cancelUrl } =
    JSON.parse(event.body || '{}');

  if (!userEmail) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing userEmail' }),
    };
  }

  try {
    // 1. Fetch existing customer ID if available
    const userRes = await ddb.send(
      new GetCommand({
        TableName: process.env.DYNAMO_TABLE,
        Key: { PK: `USER#${userEmail}`, SK: 'METADATA' },
      })
    );

    const customerId = userRes.Item?.stripeCustomerId;

    // 2. Create the $29/mo Subscription Session with off-session authorization
    const session = await createPlatformSubscriptionSession({
      userId,
      customerId,
      userEmail,
      coEvolutionOptIn: !!coEvolutionOptIn,
      successUrl:
        successUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancelUrl:
        cancelUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=cancelled`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error: any) {
    console.error('Error creating subscription session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
