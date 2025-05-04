import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types.ts';
import { stripe } from './stripe';
import { toDateTime } from './utils'; // Assuming a helper exists for date conversion
import Stripe from 'stripe'; // Import Stripe namespace for types

// Check for required environment variables
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables.');
}

// Initialize Supabase client with service_role key
const supabaseAdmin =
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

/**
 * Copies billing details from a Stripe PaymentMethod to a Supabase customer.
 */
const copyBillingDetailsToCustomer = async (
  uuid: string,
  payment_method: Stripe.PaymentMethod
) => {
  //Todo: check this assertion
  const customer = payment_method.customer as string;
  const { name, phone, address } = payment_method.billing_details;
  if (!name || !phone || !address) return;

  //@ts-ignore
  await stripe.customers.update(customer, { name, phone, address });

  // Update the user profile in Supabase
  // This assumes your `users` table has columns for billing_address, payment_method
  // Adjust the column names and data structure as needed for your `users` table schema
  const { error } = await supabaseAdmin
    .from('users')
    .update({
        // billing_address: { ...address }, // Example: Store address JSON
        // payment_method: { ...payment_method[payment_method.type] } // Example: Store relevant payment method details
     })
    .eq('id', uuid);
  if (error) throw error;
};

/**
 * Manages Stripe customer creation and retrieval linked to a Supabase user.
 */
const createOrRetrieveCustomer = async ({ email, uuid }: { email: string; uuid: string }) => {
    // Check if the user already has a Stripe customer ID in the database
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', uuid)
      .single();

    if (error) {
        console.error('Error fetching user:', error);
        throw new Error('Could not retrieve user from Supabase.');
    }

    // If customer ID exists and is a string, return it
    if (data?.stripe_customer_id && typeof data.stripe_customer_id === 'string') {
      return data.stripe_customer_id;
    }

    // If no customer ID exists, or it's not a string, create a new customer in Stripe
    const customerData: { metadata: { supabaseUUID: string }; email?: string } = {
      metadata: {
        supabaseUUID: uuid
      }
    };
    if (email) customerData.email = email;

    const customer = await stripe.customers.create(customerData);
    if (!customer) throw new Error('Stripe customer creation failed.');

    // Update the user record in Supabase with the new Stripe customer ID
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', uuid);

    if (updateError) {
      console.error(`Failed to update user ${uuid} with Stripe customer ID ${customer.id}:`, updateError);
      throw new Error('Could not update user with Stripe customer ID.');
    }

    console.log(`Created Stripe customer ${customer.id} for user ${uuid}`);
    return customer.id;
  };

/**
 * Manages subscription status changes from Stripe webhooks in the Supabase database.
 */
const manageSubscriptionStatusChange = async (
    subscriptionId: string,
    customerId: string,
    createAction = false
  ) => {
    // Get customer UUID from mapping table.
    const { data: customerData, error: noCustomerError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (noCustomerError || !customerData?.id) {
        console.error(`Webhook Error: Could not find user for Stripe customer ID ${customerId}`);
        throw new Error(`Webhook Error: User for customer ${customerId} not found.`);
    }
    const uuid = customerData.id;

    const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method']
    });

    // Upsert the latest status of the subscription object.
    const subscriptionData: Database['public']['Tables']['subscriptions']['Insert'] = {
      id: subscription.id,
      user_id: uuid,
      metadata: subscription.metadata,
      status: subscription.status,
      plan_id: subscription.items.data[0].price.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: toDateTime((subscription as any).current_period_start).toISOString(),
      current_period_end: toDateTime((subscription as any).current_period_end).toISOString(),
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id
    };

    const { error } = await supabaseAdmin.from('subscriptions').upsert(subscriptionData);
    if (error) {
        console.error('Supabase subscription upsert error:', error);
        throw error;
    }
    console.log(
      `Inserted/Updated subscription [${subscription.id}] for user [${uuid}]`
    );

    // For a new subscription copy the billing details to the customer object.
    // NOTE: This is a costly operation and should happen at the very end.
    if (createAction && subscription.default_payment_method && uuid) {
      //@ts-ignore
      await copyBillingDetailsToCustomer(
        uuid,
        subscription.default_payment_method as Stripe.PaymentMethod
      );
    }
  };

export {
  copyBillingDetailsToCustomer,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
  supabaseAdmin // Export admin client if needed elsewhere, carefully
}; 