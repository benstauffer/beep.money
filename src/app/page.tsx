"use client"

import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      setLoading(true);
      
      // Send magic link with Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Check your email for the magic link!');
      setEmail('');
    } catch (error) {
      console.error('Error sending magic link:', error);
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Toaster position="top-right" />
      
      <main className="w-full max-w-md flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          beep.money
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 text-center">
          Daily spending updates sent to your inbox
        </p>
        
        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            
            <button
              type="submit"
              className="px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 font-medium"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Get Started'}
            </button>
          </div>
        </form>
      </main>
      
      <footer className="mt-16 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} beep.money
      </footer>
    </div>
  );
}
