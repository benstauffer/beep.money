import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardContent from '@/components/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/')
  }

  // Only pass serializable data
  return (
    <DashboardContent 
      userEmail={user.email || ''} 
      userId={user.id} 
    />
  )
} 