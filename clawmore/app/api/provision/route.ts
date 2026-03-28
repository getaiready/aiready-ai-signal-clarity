import { auth } from '../../../auth';
import { ProvisioningOrchestrator } from '../../../lib/onboarding/provision-node';
import { NextResponse } from 'next/server';
import { getUserStatus, getUserMetadata } from '../../../lib/db';

export async function POST(req: Request) {
  const session = (await auth()) as any;

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email;

  // 1. Strict Authorization (Admin or Approved Beta)
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim())
    : [];

  const isAdmin = adminEmails.includes(userEmail);
  const status = await getUserStatus(userEmail);

  if (!isAdmin && status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'Beta Access Restricted' },
      { status: 403 }
    );
  }

  // 2. Extract GitHub Access Token from session
  const githubToken = session.accessToken;
  if (!githubToken) {
    return NextResponse.json(
      { error: 'Missing GitHub Access Token' },
      { status: 400 }
    );
  }

  try {
    const { userEmail, userName, repoName, coEvolutionOptIn } =
      await req.json();

    if (!userEmail || !userName || !repoName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const orchestrator = new ProvisioningOrchestrator(githubToken);

    // Fetch the unique ID for this user
    const userRes = await getUserMetadata(userEmail);
    const userId = userRes?.PK.replace('USER#', '') || 'unknown';

    // 3. Perform the provision loop
    const result = await orchestrator.provisionNode({
      userEmail,
      userId,
      userName,
      repoName,
      githubToken,
      coEvolutionOptIn: !!coEvolutionOptIn,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[ProvisionAPI] Critical Failure:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
