import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

// This is your Stripe webhook secret for testing your endpoint locally
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  console.log('🔔 Webhook request received');

  if (!signature) {
    console.error('❌ No stripe-signature in headers');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    console.log('🔐 Verifying webhook signature...');
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Webhook signature verified');
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed:`, err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`📦 Webhook event received:`, {
    type: event.type,
    id: event.id,
    object: event.object
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Processing checkout session:', {
          id: session.id,
          customerId: session.customer,
          clientReferenceId: session.client_reference_id,
          mode: session.mode,
          paymentStatus: session.payment_status
        });
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Processing subscription update:', subscription.id);
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Processing subscription deletion:', subscription.id);
        await handleSubscriptionDeleted(subscription);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing completed checkout session:', {
    id: session.id,
    customerId: session.customer,
    clientReferenceId: session.client_reference_id,
    mode: session.mode,
    paymentStatus: session.payment_status
  });
  
  const userId = session.client_reference_id;
  if (!userId) {
    throw new Error('No userId in session metadata');
  }

  // For one-time payments, we don't need to handle subscriptions
  if (session.mode !== 'subscription') {
    console.log('Not a subscription checkout session, skipping');
    return;
  }

  // Get subscription details from the session
  if (!session.subscription) {
    throw new Error('No subscription in session');
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  // Get the subscription item's period data
  const subscriptionItem = subscription.items.data[0];
  const periodStart = new Date(subscriptionItem.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscriptionItem.current_period_end * 1000).toISOString();

  // Update user record
  const { error: userError } = await supabase
    .from('users')
    .update({
      stripe_customer_id: session.customer as string,
      subscription_status: subscription.status,
      subscription_plan: 'pro',
      subscription_current_period_end: periodEnd,
    })
    .eq('id', userId);

  if (userError) {
    console.error('Failed to update user:', userError);
    throw userError;
  }

  // Create subscription record
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer as string,
      status: subscription.status,
      plan_id: 'pro',
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
    });

  if (subscriptionError) {
    console.error('Failed to create subscription record:', subscriptionError);
    throw subscriptionError;
  }

  console.log('Successfully processed checkout session:', {
    userId,
    subscriptionId: subscription.id,
    status: subscription.status
  });
}

async function handleSubscriptionUpdated(subscriptionResponse: Stripe.Subscription) {
  console.log('Processing subscription update:', subscriptionResponse.id);
  
  // Find user by customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscriptionResponse.customer)
    .single();

  if (userError || !userData) {
    console.error('Failed to find user for subscription:', userError);
    throw userError || new Error('User not found');
  }

  // Update user subscription status
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_status: subscriptionResponse.status,
      subscription_current_period_end: new Date(subscriptionResponse.items.data[0].current_period_end * 1000).toISOString(),
    })
    .eq('id', userData.id);

  if (updateError) {
    console.error('Failed to update user subscription:', updateError);
    throw updateError;
  }

  // Update subscription record
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .update({
      status: subscriptionResponse.status,
      current_period_end: new Date(subscriptionResponse.items.data[0].current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscriptionResponse.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscriptionResponse.id);

  if (subscriptionError) {
    console.error('Failed to update subscription record:', subscriptionError);
    throw subscriptionError;
  }

  console.log('Successfully processed subscription update:', {
    userId: userData.id,
    subscriptionId: subscriptionResponse.id,
    status: subscriptionResponse.status
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id);
  
  // Find user by customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (userError || !userData) {
    console.error('Failed to find user for subscription:', userError);
    throw userError || new Error('User not found');
  }

  // Update user subscription status
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_current_period_end: null,
    })
    .eq('id', userData.id);

  if (updateError) {
    console.error('Failed to update user subscription:', updateError);
    throw updateError;
  }

  // Update subscription record
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: true,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (subscriptionError) {
    console.error('Failed to update subscription record:', subscriptionError);
    throw subscriptionError;
  }

  console.log('Successfully processed subscription deletion:', {
    userId: userData.id,
    subscriptionId: subscription.id
  });
} 