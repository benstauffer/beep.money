'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const email = formData.get('email') as string

  // Ensure we have the correct URL format
  const redirectUrl = new URL('/api/auth/callback', process.env.NEXT_PUBLIC_APP_URL).toString()

  // Send a magic link to the user's email
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  })

  if (error) {
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