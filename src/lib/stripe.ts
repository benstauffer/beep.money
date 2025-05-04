import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // https://github.com/stripe/stripe-node#configuration
  apiVersion: '2025-04-30.basil', // Use the specific version required by the library types
  appInfo: {
    name: 'Beep Money',
    version: '0.1.0' // Replace with your app version if desired
  }
}); 