import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import SubscriptionContent from '../../components/SubscriptionContent'

export default async function SubscribePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <SubscriptionContent userEmail={user.email || ''} userId={user.id} />
    </div>
  )
} 