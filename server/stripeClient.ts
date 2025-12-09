// Stripe Client - Uses environment variables with Replit connector fallback
// Handles credentials fetching and StripeSync initialization

import Stripe from 'stripe';

let connectionSettings: any;
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;

async function getCredentialsFromConnector(): Promise<{ publishableKey: string; secretKey: string } | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    if (!hostname) {
      return null;
    }

    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? 'depl ' + process.env.WEB_REPL_RENEWAL
        : null;

    if (!xReplitToken) {
      return null;
    }

    const connectorName = 'stripe';
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const targetEnvironment = isProduction ? 'production' : 'development';

    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', connectorName);
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    connectionSettings = data.items?.[0];

    if (!connectionSettings || !connectionSettings.settings?.publishable || !connectionSettings.settings?.secret) {
      return null;
    }

    return {
      publishableKey: connectionSettings.settings.publishable,
      secretKey: connectionSettings.settings.secret,
    };
  } catch (error) {
    console.log('Replit connector not available, using environment variables');
    return null;
  }
}

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // Try Replit connector first
  const connectorCreds = await getCredentialsFromConnector();
  if (connectorCreds) {
    cachedCredentials = connectorCreds;
    return cachedCredentials;
  }

  // Fall back to environment variables
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.VITE_STRIPE_PUBLIC_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  if (!publishableKey) {
    throw new Error('VITE_STRIPE_PUBLIC_KEY environment variable is not set');
  }

  cachedCredentials = { publishableKey, secretKey };
  return cachedCredentials;
}

// Get Stripe client - call fresh each time, don't cache
export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

// Get publishable key for client-side
export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

// Get secret key for server-side operations
export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

// StripeSync singleton for webhook processing and data sync
let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
