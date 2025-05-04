import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = subscribeSchema.parse(body);
    
    // Check if user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      console.error('Error checking existing user:', findError);
      return NextResponse.json(
        { message: 'Failed to check existing user' },
        { status: 500 }
      );
    }
    
    if (existingUser) {
      return NextResponse.json(
        { message: 'You are already subscribed to our newsletter' },
        { status: 200 }
      );
    }
    
    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ email }])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { message: 'Failed to subscribe to newsletter' },
        { status: 500 }
      );
    }
    
    // Optionally send a welcome email here
    
    return NextResponse.json(
      { message: 'Successfully subscribed to newsletter', userId: newUser.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Subscription error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 