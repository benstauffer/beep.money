import { createClient } from '../../../../utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successfully authenticated, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // If there's no code or there was an error, redirect to home page
  return NextResponse.redirect(new URL('/', request.url))
} 