"use client"

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import TellerConnect from '@/components/TellerConnect';
import AccountsList from '@/components/AccountsList';
import SpendingSummary from '@/components/SpendingSummary';
import StripeSettings from '@/components/StripeSettings';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { LogOut, Lock, Check, CreditCard } from 'lucide-react';

// Separate component that uses useSearchParams
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    // Check URL parameters for success/cancel messages from Stripe
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success) {
      toast.success('Subscription successful! Thank you for your support.');
      setHasSubscription(true);
    }

    if (canceled) {
      toast.error('Subscription canceled. Feel free to try again when you\'re ready.');
    }

    // Remove query parameters from URL
    if (success || canceled) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (!session) {
          // Redirect to login if no session
          router.push('/');
          return;
        }
        
        setUser(session.user);
        
        // Check subscription status
        const { data, error: subscriptionError } = await supabase
          .from('users')
          .select('subscription_status, subscription_plan')
          .eq('id', session.user.id)
          .single();
          
        if (!subscriptionError && data) {
          setHasSubscription(data.subscription_status === 'active');
          console.log('Subscription status:', data.subscription_status);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to authenticate');
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, [router]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            beep.money
          </h1>
          
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-4">
              {user?.email}
            </span>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        <div className="max-w-3xl mx-auto px-4 sm:px-12 py-16">
          <div className="space-y-12 mb-12">
            {hasSubscription ? (
              <>
                {/* Card 1: Spending Summary */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    SPENDING
                  </div>
                  
                  <div className="mb-6">
                    <SpendingSummary />
                  </div>
                </div>
                
                {/* Card 2: Accounts */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    ACCOUNTS
                  </div>
                  
                  <div className="mb-6">
                    <AccountsList />
                    
                    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Connect a New Account
                      </h3>
                      <TellerConnect />
                    </div>
                  </div>
                </div>
                
                {/* Card 3: Settings */}
                <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                    SETTINGS
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Subscription Section */}
                    <StripeSettings />
                    
                    {/* Logout Button */}
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              // Free user view - just the premium features card
              <div className="relative pt-16 pb-12 px-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                <div className="absolute -top-4 left-8 bg-yellow-300 px-6 py-2 font-extrabold text-2xl shadow-sm transform -rotate-2" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                  PREMIUM FEATURES
                </div>
                
                <div className="mb-4 text-center">
                  <div className="flex justify-center mb-4">
                    <Lock className="h-12 w-12 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Unlock Premium Features</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Subscribe to access powerful financial tracking tools, connect your bank accounts, 
                    and get detailed spending analytics.
                  </p>
                  
                  <div className="grid gap-3 mb-8">
                    <div className="p-3 rounded-md border border-gray-200 bg-white flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span>Bank account connections</span>
                    </div>
                    <div className="p-3 rounded-md border border-gray-200 bg-white flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span>Daily spending summaries</span>
                    </div>
                    <div className="p-3 rounded-md border border-gray-200 bg-white flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span>Weekly and monthly spending breakdowns</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mb-6" 
                    size="lg"
                    onClick={async () => {
                      if (!user?.id) {
                        toast.error('Please sign in to subscribe');
                        return;
                      }

                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.user?.email) {
                          toast.error('Could not get user email');
                          return;
                        }

                        const response = await fetch('/api/stripe/create-checkout', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          credentials: 'include',
                          body: JSON.stringify({
                            planId: 'pro',
                            userId: user.id,
                            email: session.user.email
                          }),
                        });

                        if (!response.ok) {
                          throw new Error(`HTTP error! Status: ${response.status}`);
                        }

                        const data = await response.json();
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          toast.error('Could not start checkout process');
                        }
                      } catch (error) {
                        console.error('Error:', error);
                        toast.error('Failed to process subscription request');
                      }
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscribe for $1/week
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Main component with Suspense boundary
export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-xl">Loading...</div>
    </div>}>
      <DashboardContent />
    </Suspense>
  );
} 