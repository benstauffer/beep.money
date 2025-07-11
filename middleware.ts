import { type NextRequest } from 'next/server'
import { updateSession } from './src/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Skip middleware for auth callback route
  if (request.nextUrl.pathname === '/api/auth/callback') {
    return;
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public resources)
     * - api/auth/callback (auth callback endpoint)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}