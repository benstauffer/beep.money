'use client'

import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { loginWithEmail } from '@/app/actions'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    
    try {
      setLoading(true)
      
      const formData = new FormData()
      formData.append('email', email)
      
      const result = await loginWithEmail(formData)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      toast.success('Check your email for the magic link!')
      setEmail('')
    } catch (error) {
      console.error('Error sending magic link:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send magic link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            className="px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          
          <button
            type="submit"
            className="px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 font-medium transition-colors"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Get Started'}
          </button>
        </div>
      </form>
    </>
  )
} 