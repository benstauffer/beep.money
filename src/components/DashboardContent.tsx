'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { LogOut, DollarSign, CreditCard, Settings, Check, Lock } from 'lucide-react'
import { signOut } from '@/app/actions'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import TellerConnect from '@/components/TellerConnect'
import AccountsList from '@/components/AccountsList'

interface DashboardContentProps {
  userEmail: string
  userId: string
}

interface SpendingSummary {
  dailySpend: string
  weeklySpend: string
  monthlySpend: string
  thisWeekSpend: string
  thisMonthSpend: string
}

export default function DashboardContent({ userEmail, userId }: DashboardContentProps) {
  const searchParams = useSearchParams()
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription-status', userId],
    queryFn: async () => {
      const response = await fetch('/api/stripe/subscription-status')
      if (!response.ok) throw new Error('Failed to fetch subscription status')
      return response.json()
    },
    enabled: !!userId
  })

  // Fetch spending summary if subscribed
  const { data: spendingSummary } = useQuery<SpendingSummary>({
    queryKey: ['spending-summary', userId],
    queryFn: async () => {
      const response = await fetch('/api/spending/summary')
      if (!response.ok) throw new Error('Failed to fetch spending summary')
      return response.json()
    },
    enabled: !!userId && subscriptionStatus?.active
  })

  const handleManageSubscription = async () => {
    try {
      setIsLoadingPortal(true)
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error opening portal:', error)
      toast.error('Failed to open subscription management')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  useEffect(() => {
    // Check URL parameters for success/cancel messages from Stripe
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success) {
      toast.success('Subscription successful! Thank you for your support.')
    }

    if (canceled) {
      toast.error('Subscription canceled. Feel free to try again when you\'re ready.')
    }

    // Remove query parameters from URL
    if (success || canceled) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  // Show loading state
  if (subscriptionLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <div className="max-w-3xl mx-auto px-4 sm:px-12 py-16">
            <div className="text-center">Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Toaster position="top-right" />
      
      <main className="flex-grow">
        <div className="max-w-3xl mx-auto px-4 sm:px-12 py-16">
          <div className="space-y-12 mb-12">
            {subscriptionStatus?.active ? (
              <>
                {/* Card 1: Spending Summary */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    SPENDING
                  </div>
                  
                  <div className="space-y-3">
                    {/* Yesterday - single row */}
                    <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-neutral-600">Yesterday</p>
                      <p className="text-2xl">
                        {spendingSummary?.dailySpend || '$0.00'}
                      </p>
                    </div>

                    {/* 2x2 grid for other time periods */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Last 7 days */}
                      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-neutral-600">Last 7 days</p>
                        <p className="text-2xl">
                          {spendingSummary?.weeklySpend || '$0.00'}
                        </p>
                      </div>

                      {/* Last 30 days */}
                      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-neutral-600">Last 30 days</p>
                        <p className="text-2xl">
                          {spendingSummary?.monthlySpend || '$0.00'}
                        </p>
                      </div>

                      {/* This week */}
                      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-neutral-600">This week</p>
                        <p className="text-2xl">
                          {spendingSummary?.thisWeekSpend || '$0.00'}
                        </p>
                      </div>

                      {/* This month */}
                      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-neutral-600">This month</p>
                        <p className="text-2xl">
                          {spendingSummary?.thisMonthSpend || '$0.00'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Bank Accounts */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    ACCOUNTS
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Connected Bank Accounts</h3>
                    <AccountsList />
                    <h3 className="text-lg font-semibold mt-6">Connect a New Account</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      You can connect up to 3 bank accounts to track your spending.
                    </p>
                    <TellerConnect />
                  </div>
                </div>

                {/* Card 2: Settings */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    SETTINGS
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200">
                            <div>
                              <p className="font-medium">Weekly Spending Report</p>
                              <p className="text-sm text-neutral-600">Get a summary of your spending every Monday morning</p>
                            </div>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                fetch('/api/email/test', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ type: 'weekly_report' }),
                                })
                                .then(response => {
                                  if (!response.ok) throw new Error('Failed to send test email');
                                  toast.success('Test email sent! Check your inbox.');
                                })
                                .catch(error => {
                                  console.error('Error sending test email:', error);
                                  toast.error('Failed to send test email');
                                });
                              }}
                            >
                              Send Test Email
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
                        <p className="text-neutral-600 mb-4">Logged in as: {userEmail}</p>
                        
                        <Button 
                          onClick={handleManageSubscription}
                          disabled={isLoadingPortal}
                          variant="outline"
                          className="w-full mb-2"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {isLoadingPortal ? 'Loading...' : 'Manage Subscription'}
                        </Button>
                        
                        <form action={signOut}>
                          <Button 
                            type="submit"
                            variant="outline"
                            className="w-full"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Premium Features Card */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    PREMIUM FEATURES
                  </div>
                  
                  <div className="mb-4 text-center">
                    <Lock className="h-12 w-12 mx-auto text-primary/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Unlock Premium Features</h3>
                    <p className="text-neutral-600 mb-6">
                      Subscribe to access powerful financial tracking tools, connect your bank accounts, 
                      and get detailed spending analytics.
                    </p>
                    
                    <div className="grid gap-3">
                      <div className="p-3 rounded-md border border-neutral-200 bg-white flex items-center">
                        <Check className="h-5 w-5 text-primary mr-3" />
                        <span>Bank account connections</span>
                      </div>
                      <div className="p-3 rounded-md border border-neutral-200 bg-white flex items-center">
                        <Check className="h-5 w-5 text-primary mr-3" />
                        <span>Daily spending summaries</span>
                      </div>
                      <div className="p-3 rounded-md border border-neutral-200 bg-white flex items-center">
                        <Check className="h-5 w-5 text-primary mr-3" />
                        <span>Weekly and monthly spending breakdowns</span>
                      </div>
                      
                      <Button 
                        className="mt-4" 
                        size="lg"
                        onClick={() => window.location.href = '/subscribe'}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Subscribe Now
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Settings Card for non-subscribers */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    SETTINGS
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col space-y-4">
                      <h3 className="text-lg font-semibold">Account Settings</h3>
                      <p className="text-neutral-600">Logged in as: {userEmail}</p>
                      
                      <form action={signOut}>
                        <Button 
                          type="submit"
                          variant="outline"
                          className="w-full"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 