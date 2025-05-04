'use client'

import { useState } from 'react'
import { CreditCard, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface SubscriptionContentProps {
  userEmail: string
  userId: string
}

export default function SubscriptionContent({ userEmail, userId }: SubscriptionContentProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubscribe = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail,
          planId: 'pro'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Error starting subscription:', error)
      toast.error('Failed to start subscription process')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <button
        onClick={() => router.back()}
        className="mb-8 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">Upgrade to Pro</h1>
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium">Pro Plan</span>
            <span className="text-2xl font-bold">$9/mo</span>
          </div>
          
          <ul className="space-y-3">
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✓</span>
              Connect unlimited bank accounts
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✓</span>
              Daily spending summaries
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✓</span>
              Weekly and monthly analytics
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✓</span>
              Custom spending categories
            </li>
          </ul>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? (
            'Processing...'
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscribe Now
            </>
          )}
        </button>
      </div>
    </div>
  )
} 