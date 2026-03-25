import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument, GetCommand } from '@aws-sdk/lib-dynamodb';
import { sendApprovalEmail } from '../../../../lib/email';

const dbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

const documentClient = DynamoDBDocument.from(dbClient);

export async function GET() {
  const session = await auth();
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim())
    : [];

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In NextAuth DynamoDBAdapter, users are GSI1PK = 'USER'
    const res = await documentClient.query({
      TableName: process.env.DYNAMO_TABLE!,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'USER',
      },
    });

    return NextResponse.json({ users: res.Items || [] });
  } catch (err: any) {
    console.error('[API] Error fetching users:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim())
    : [];

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, status } = await request.json();
    if (!id)
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Fetch user details first to send email if approved
    const userRes = await documentClient.send(
      new GetCommand({
        TableName: process.env.DYNAMO_TABLE!,
        Key: {
          PK: `USER#${id}`,
          SK: `USER#${id}`,
        },
      })
    );

    const user = userRes.Item;

    // Update user status
    await documentClient.update({
      TableName: process.env.DYNAMO_TABLE!,
      Key: {
        PK: `USER#${id}`,
        SK: `USER#${id}`,
      },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: {
        '#s': 'status',
      },
      ExpressionAttributeValues: {
        ':s': status,
      },
    });

    // If newly approved, send email
    if (status === 'APPROVED' && user?.email) {
      // Don't await email sending to keep response fast
      sendApprovalEmail(user.email, user.name || 'Developer').catch(
        console.error
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] Error updating user:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim())
    : [];

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, name } = await request.json();
    if (!email)
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Generate a secure ID or use email as part of PK
    const id = Buffer.from(email).toString('base64').substring(0, 16);

    // Create item in DynamoDB that the adapter and signIn callback can recognize
    // We map it to GSI1 PK: USER, SK: email
    await documentClient.put({
      TableName: process.env.DYNAMO_TABLE!,
      Item: {
        PK: `USER#${id}`,
        SK: `USER#${id}`,
        GSI1PK: 'USER',
        GSI1SK: email,
        id: id,
        email: email,
        name: name || 'Pre-approved User',
        status: 'APPROVED',
        type: 'USER',
        createdAt: new Date().toISOString(),
      },
    });

    // Send notification
    await sendApprovalEmail(email, name || 'Pre-approved User');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] Error pre-approving user:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
