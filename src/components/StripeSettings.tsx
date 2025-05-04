"use client"

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type Plan = {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
};

// These would come from your backend in a real implementation
const SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Basic spending insights',
      'Connect up to 2 accounts',
      'Weekly email reports',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    interval: 'month',
    features: [
      'Advanced spending analytics',
      'Unlimited accounts',
      'Daily email reports',
      'Custom categories',
      'Savings recommendations',
    ],
    isPopular: true,
  }
];

export default function StripeSettings() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState('free'); // This would come from your backend
  const [hasSubscription, setHasSubscription] = useState(false);
  const [customerPortalUrl, setCustomerPortalUrl] = useState('');

  // Fetch user's subscription status on mount
  useEffect(() => {
    async function fetchSubscriptionStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) return;
        
        const { data, error } = await supabase
          .from('users')
          .select('subscription_status, subscription_plan')
          .eq('id', session.user.id)
          .single();
        
        if (!error && data) {
          const hasActiveSub = data.subscription_status === 'active';
          setHasSubscription(hasActiveSub);
          setCurrentPlan(hasActiveSub ? data.subscription_plan : 'free');
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
      }
    }
    
    fetchSubscriptionStatus();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (planId === currentPlan) {
      toast.error('You are already subscribed to this plan');
      return;
    }
    
    if (planId === 'free' && currentPlan !== 'free') {
      // Handle downgrade to free plan
      toast.error('Please contact support to downgrade your plan');
      return;
    }
    
    try {
      setLoading(planId);
      
      // Get the current user session to include userId and email
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !session?.user?.email) {
        throw new Error('No authenticated user');
      }
      
      // Call your backend to create a checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId: session.user.id,
          email: session.user.email
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error starting subscription:', error);
      toast.error('Failed to start subscription process');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading('manage');
      
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('No authenticated user');
      }
      
      // Call your backend to create a portal session
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setLoading(null);
    }
  };

  // If the user has an active subscription, just show the manage button
  if (hasSubscription) {
    return (
      <div className="text-center">
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          You currently have an active subscription.
        </p>
        <button
          onClick={handleManageSubscription}
          disabled={loading !== null}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading === 'manage' ? 'Processing...' : 'Manage Subscription'}
        </button>
      </div>
    );
  }

  // Otherwise show the subscription plans
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-gray-800 border rounded-lg p-6 shadow-sm relative ${
              plan.isPopular
                ? 'border-blue-500 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold uppercase py-1 px-2 rounded-bl-lg rounded-tr-lg">
                Popular
              </div>
            )}
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {plan.name}
            </h3>
            
            <div className="mt-4 mb-6">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ${plan.price}
              </span>
              <span className="text-gray-600 dark:text-gray-400">/{plan.interval}</span>
            </div>
            
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500 dark:text-green-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading !== null || plan.id === currentPlan}
              className={`w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                plan.id === currentPlan
                  ? 'bg-green-100 text-green-800 cursor-default'
                  : plan.isPopular
                  ? 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400'
              }`}
            >
              {loading === plan.id ? (
                <span>Processing...</span>
              ) : plan.id === currentPlan ? (
                <span>Current Plan</span>
              ) : (
                <span>Subscribe</span>
              )}
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <button
          onClick={handleManageSubscription}
          disabled={loading !== null}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading === 'manage' ? 'Processing...' : 'Manage Subscription'}
        </button>
      </div>
    </div>
  );
} 