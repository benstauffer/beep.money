import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Check required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
});

const schema = z.object({
  userId: z.string(),
});

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { userId } = schema.parse(body);
    
    console.log('Creating portal for user:', userId);
    
    // Use the service role key for admin level access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get the user's Stripe customer ID from the database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (userError || !user || !user.stripe_customer_id) {
      console.error('Error fetching user stripe data:', userError);
      return NextResponse.json(
        { message: 'No subscription found for this user' },
        { status: 404 }
      );
    }
    
    // Create a billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });
    
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'An error occurred while creating the portal session' },
      { status: 500 }
    );
  }
} 