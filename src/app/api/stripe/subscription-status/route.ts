import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription status
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .single()

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError)
      return NextResponse.json(
        { active: false, status: 'inactive' }
      )
    }

    // Check if subscription is active and not expired
    const isActive = subscriptionData?.status === 'active' && 
      new Date(subscriptionData.current_period_end) > new Date()

    return NextResponse.json({
      active: isActive,
      status: subscriptionData?.status || 'inactive',
      currentPeriodEnd: subscriptionData?.current_period_end
    })
  } catch (error) {
    console.error('Error in subscription status route:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 