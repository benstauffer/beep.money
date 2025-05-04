import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Check required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
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
  const signature = request.headers.get('stripe-signature');

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
      // Checkout & Payment Events
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Processing checkout session:', {
          id: session.id,
          customerId: session.customer,
          clientReferenceId: session.client_reference_id
        });
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💰 Payment succeeded:', paymentIntent.id);
        // Log successful payment
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);
        await handlePaymentFailed(paymentIntent);
        break;
      }

      // Subscription Events
      case 'customer.subscription.created':
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
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('⚠️ Trial ending soon:', subscription.id);
        await handleTrialEnding(subscription);
        break;
      }

      // Invoice Events
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('📃 Invoice paid:', invoice.id);
        await handleInvoicePaid(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('❌ Invoice payment failed:', invoice.id);
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case 'invoice.upcoming': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('📅 Upcoming invoice:', invoice.id);
        await handleUpcomingInvoice(invoice);
        break;
      }

      // Customer Events
      case 'customer.created':
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        console.log('👤 Customer updated:', customer.id);
        await handleCustomerUpdated(customer);
        break;
      }
      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer;
        console.log('❌ Customer deleted:', customer.id);
        await handleCustomerDeleted(customer);
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

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Find user by customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', paymentIntent.customer)
    .single();

  if (userError || !userData) {
    console.error('Failed to find user for payment:', userError);
    return;
  }

  // Update payment status in your database
  await supabase
    .from('payments')
    .insert({
      user_id: userData.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      status: 'failed',
      error_message: paymentIntent.last_payment_error?.message
    });

  // You might want to send an email notification here
}

async function handleTrialEnding(subscription: Stripe.Subscription) {
  // Find user by customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (userError || !userData) {
    console.error('Failed to find user for trial ending notification:', userError);
    return;
  }

  // Update trial status
  await supabase
    .from('users')
    .update({
      trial_end_notified: true
    })
    .eq('id', userData.id);

  // You might want to send an email notification here
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (typeof invoice.customer !== 'string') return;

  // Find user by customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (userError || !userData) {
    console.error('Failed to find user for invoice:', userError);
    return;
  }

  // Record the successful payment
  await supabase
    .from('payments')
    .insert({
      user_id: userData.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid,
      status: 'paid',
      payment_date: new Date().toISOString()
    });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (typeof invoice.customer !== 'string') return;

  // Find user by customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (userError || !userData) {
    console.error('Failed to find user for failed invoice:', userError);
    return;
  }

  // Record the failed payment
  await supabase
    .from('payments')
    .insert({
      user_id: userData.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      status: 'failed',
      payment_date: new Date().toISOString()
    });

  // You might want to send an email notification here
}

async function handleUpcomingInvoice(invoice: Stripe.Invoice) {
  if (typeof invoice.customer !== 'string') return;

  // Find user by customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (userError || !userData) {
    console.error('Failed to find user for upcoming invoice:', userError);
    return;
  }

  // You might want to send an email notification here about the upcoming charge
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  // Update customer information in your database
  const { error } = await supabase
    .from('users')
    .update({
      stripe_customer_email: customer.email,
      stripe_customer_name: customer.name,
      stripe_customer_metadata: customer.metadata
    })
    .eq('stripe_customer_id', customer.id);

  if (error) {
    console.error('Failed to update customer information:', error);
  }
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  // Update user record to remove Stripe customer ID and subscription info
  const { error } = await supabase
    .from('users')
    .update({
      stripe_customer_id: null,
      subscription_status: 'canceled',
      subscription_plan: null,
      subscription_current_period_end: null
    })
    .eq('stripe_customer_id', customer.id);

  if (error) {
    console.error('Failed to handle customer deletion:', error);
  }
} 