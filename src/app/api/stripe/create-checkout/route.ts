import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Price IDs for each plan - these come from environment variables
const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID! // Pro subscription price ID from environment
};

// Validate required environment variables
if (!process.env.STRIPE_PRO_PRICE_ID) {
  throw new Error('STRIPE_PRO_PRICE_ID environment variable is required');
}

const schema = z.object({
  planId: z.enum(['pro']),
  userId: z.string(),
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { planId, userId, email } = schema.parse(body);
    
    console.log('Creating checkout for user:', userId, 'with email:', email);
    
    // Create a Supabase client with the service role key
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );
    
    // Get the price ID for the requested plan
    const priceId = PRICE_IDS[planId];
    
    if (!priceId) {
      return NextResponse.json(
        { message: 'Invalid plan ID' },
        { status: 400 }
      );
    }
    
    // Create a checkout session with Stripe
    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer_email: email,
        client_reference_id: userId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        metadata: {
          userId,
          planId,
          userEmail: email
        },
        subscription_data: {
          metadata: {
            userId,
            planId
          }
        }
      });
      
      console.log('Checkout session created:', {
        id: checkoutSession.id,
        mode: checkoutSession.mode,
        email: checkoutSession.customer_email,
        url: checkoutSession.url
      });
      
      if (!checkoutSession.url) {
        throw new Error('Stripe did not return a checkout URL');
      }
      
      return NextResponse.json({ url: checkoutSession.url });
    } catch (stripeError: any) {
      console.error('Stripe checkout creation error:', stripeError);
      return NextResponse.json(
        { message: 'Error creating Stripe checkout session', error: stripeError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in checkout handler:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'An error occurred while creating the checkout session' },
      { status: 500 }
    );
  }
} 