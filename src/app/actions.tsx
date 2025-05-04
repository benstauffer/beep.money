'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'

function getRedirectUrl(path: string) {
  // Ensure we're using the non-www version of the domain
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace('www.', '')
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set')
  }
  // Remove trailing slash from base URL if it exists
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  // Ensure path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBaseUrl}${cleanPath}`
}

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const email = formData.get('email') as string

  console.log('Sending magic link with redirect to:', getRedirectUrl('/api/auth/callback'))

  // Send a magic link to the user's email
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getRedirectUrl('/api/auth/callback'),
    },
  })

  if (error) {
    console.error('Error sending magic link:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  
  // Sign the user out
  await supabase.auth.signOut()
  
  // Revalidate the layout to update UI
  revalidatePath('/', 'layout')
  redirect('/')
}