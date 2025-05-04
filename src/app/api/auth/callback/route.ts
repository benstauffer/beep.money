import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('Auth callback received:', {
    url: request.url,
    hasCode: !!code
  })
  
  if (code) {
    const supabase = await createClient()
    console.log('Exchanging code for session...')
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('Successfully authenticated, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', requestUrl))
    }
    
    console.error('Error exchanging code for session:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error.message)}`, requestUrl)
    )
  }

  console.log('No code provided, redirecting to home')
  return NextResponse.redirect(new URL('/', requestUrl))
} 