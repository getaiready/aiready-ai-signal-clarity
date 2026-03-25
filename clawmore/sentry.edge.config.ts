import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  debug: false,
  beforeSend(event) {
    const errorMessage = event.exception?.values?.[0]?.value || '';
    if (
      errorMessage.includes('NEXT_NOT_FOUND') ||
      errorMessage.includes('NEXT_REDIRECT')
    ) {
      return null;
    }
    return event;
  },
});
