'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { LogOut, CreditCard, Check, Lock } from 'lucide-react'
import { signOut } from '@/app/actions'

interface DashboardContentProps {
  userEmail: string
  userId: string
}

export default function DashboardContent({ userEmail, userId }: DashboardContentProps) {
  const searchParams = useSearchParams()
  const [hasSubscription, setHasSubscription] = useState(false)

  useEffect(() => {
    // Check URL parameters for success/cancel messages from Stripe
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success) {
      toast.success('Subscription successful! Thank you for your support.')
      setHasSubscription(true)
    }

    if (canceled) {
      toast.error('Subscription canceled. Feel free to try again when you\'re ready.')
    }

    // Remove query parameters from URL
    if (success || canceled) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex flex-col p-8">
      <Toaster position="top-right" />
      
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">beep.money</h1>
        <form action={signOut}>
          <button 
            type="submit"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4 inline" />
            Sign Out
          </button>
        </form>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto">
          {hasSubscription ? (
            // Pro user content
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Welcome, {userEmail}</h2>
              <p className="text-gray-600 dark:text-gray-300">
                You are now logged in. This dashboard will show your spending updates and financial insights.
              </p>
            </div>
          ) : (
            // Premium features card for non-subscribers
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
              <div className="text-center mb-8">
                <Lock className="h-12 w-12 mx-auto text-blue-500/50 mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Unlock Premium Features</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Subscribe to access powerful financial tracking tools, connect your bank accounts, 
                  and get detailed spending analytics.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Bank account connections</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Daily spending summaries</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Weekly and monthly spending breakdowns</span>
                </div>
              </div>

              <button 
                onClick={() => window.location.href = '/subscribe'}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe Now
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 