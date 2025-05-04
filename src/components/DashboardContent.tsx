'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions'

interface DashboardContentProps {
  userEmail: string
  userId: string
}

export default function DashboardContent({ userEmail, userId }: DashboardContentProps) {
  const searchParams = useSearchParams()

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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome, {userEmail}</h2>
            <p className="text-gray-600 dark:text-gray-300">
              You are now logged in. This dashboard will show your spending updates and financial insights.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
} 