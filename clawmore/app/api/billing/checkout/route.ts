import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { createPlatformSubscriptionSession } from '../../../../lib/billing';
import { getUserMetadata } from '../../../../lib/db';
import { createLogger } from '../../../../lib/logger';

const log = createLogger('checkout');

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const tier = body.tier || 'pro'; // default to Pro ($49)

    const host =
      process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;

    // Lookup existing Stripe customer and userId to avoid duplicates
    const metadata = await getUserMetadata(session.user.email);
    const existingCustomerId = metadata?.stripeCustomerId;
    const userId = metadata?.PK.replace('USER#', '') || 'unknown';

    const checkoutSession = await createPlatformSubscriptionSession({
      customerId: existingCustomerId,
      userEmail: session.user.email,
      userId,
      tier,
      successUrl: `${host}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${host}/dashboard`,
    });

    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session url');
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    log.error({ err: error }, 'Checkout session creation failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
