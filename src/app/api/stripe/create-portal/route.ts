import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      throw new Error('Not authenticated');
    }

    // Return the direct Stripe billing URL
    return NextResponse.json({ 
      url: 'https://billing.stripe.com/p/login/eVa16abde7lR7sI000' 
    });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 