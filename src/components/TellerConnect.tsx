"use client"

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';
import { useAccounts } from '@/lib/contexts/AccountsContext';
import { MAX_ACCOUNTS } from '@/components/AccountsList';

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: TellerConnectConfig) => TellerConnectInstance;
    };
  }
}

interface TellerConnectConfig {
  applicationId: string;
  environment: 'sandbox' | 'development' | 'production';
  products: string[];
  onInit?: () => void;
  onSuccess: (enrollment: TellerEnrollment) => void;
  onExit?: () => void;
  selectAccount?: 'disabled' | 'single' | 'multiple';
  nonce?: string;
}

interface TellerConnectInstance {
  open: () => void;
}

interface TellerEnrollment {
  accessToken: string;
  user: {
    id: string;
  };
  enrollment: {
    id: string;
    institution: {
      name: string;
    };
  };
  signatures?: string[];
}

export default function TellerConnect() {
  const [loading, setLoading] = useState(false);
  const [tellerConnectInstance, setTellerConnectInstance] = useState<TellerConnectInstance | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const { refreshAccounts } = useAccounts();
  const [accountCount, setAccountCount] = useState(0);
  const supabase = createClient();

  // Get the current user ID
  useEffect(() => {
    async function getUserId() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        setUserId(session.user.id);
        console.log("TellerConnect: Got user ID:", session.user.id);
      } else {
        console.warn("TellerConnect: No user session found");
        toast.error("Please sign in to connect your bank account");
      }
    }
    
    getUserId();
  }, []);

  // Get current account count
  useEffect(() => {
    async function fetchAccountCount() {
      if (!userId) return;
      
      try {
        // First try to count from teller_accounts table (preferred)
        const { count: accountsCount, error: accountsError } = await supabase
          .from('teller_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        if (!accountsError && accountsCount !== null) {
          setAccountCount(accountsCount);
          return;
        }
        
        // Fall back to counting from teller_enrollments
        const { count: enrollmentsCount, error: enrollmentsError } = await supabase
          .from('teller_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        if (enrollmentsError) {
          console.error('Error fetching account count:', enrollmentsError);
          return;
        }
        
        setAccountCount(enrollmentsCount || 0);
      } catch (error) {
        console.error('Error fetching account count:', error);
      }
    }
    
    fetchAccountCount();
  }, [userId, refreshAccounts, supabase]);

  // Load Teller Connect script
  useEffect(() => {
    if (scriptLoaded) return;
    
    const script = document.createElement('script');
    script.src = 'https://cdn.teller.io/connect/connect.js';
    script.async = true;
    
    script.onload = () => {
      console.log("TellerConnect: Script loaded successfully");
      setScriptLoaded(true);
      setScriptError(null);
    };
    
    script.onerror = (e) => {
      console.error("TellerConnect: Error loading script:", e);
      setScriptError("Failed to load Teller Connect");
      toast.error("Failed to load bank connection service");
    };
    
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, [scriptLoaded]);

  // Initialize Teller Connect
  useEffect(() => {
    if (!scriptLoaded || !window.TellerConnect || !userId) {
      if (!window.TellerConnect && scriptLoaded) {
        console.error("TellerConnect: TellerConnect object not available even though script loaded");
      }
      return;
    }
    
    // Get application ID from environment variable
    const applicationId = process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID;
    
    if (!applicationId) {
      console.error('TellerConnect: Missing Teller application ID. Current value:', process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID);
      toast.error('Bank connection configuration is missing');
      return;
    }
    
    console.log("TellerConnect: Initializing with app ID:", applicationId);
    
    try {
      const tellerConnect = window.TellerConnect.setup({
        applicationId: applicationId,
        environment: 'development',
        products: ['transactions', 'balance'],
        selectAccount: 'multiple',
        onInit: () => {
          console.log('TellerConnect: Initialized successfully');
          setLoading(false);
        },
        onSuccess: async (enrollment) => {
          console.log('TellerConnect: Enrollment successful', enrollment);
          setLoading(false);
          
          try {
            console.log("TellerConnect: Saving enrollment with user ID:", userId);
            
            const response = await fetch('/api/teller/enrollment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accessToken: enrollment.accessToken,
                enrollmentId: enrollment.enrollment.id,
                userId: userId,
                institutionName: enrollment.enrollment.institution.name,
              }),
            });
            
            let responseData;
            try {
              responseData = await response.json();
            } catch (jsonError) {
              console.error("TellerConnect: Error parsing API response:", jsonError);
              throw new Error('Invalid response from server');
            }
            
            if (!response.ok) {
              console.error("TellerConnect: API error:", responseData);
              const errorMessage = responseData?.error?.message || 'Failed to save enrollment';
              throw new Error(errorMessage);
            }
            
            const numAccounts = responseData?.accounts?.length || 0;
            toast.success(`Connected to ${enrollment.enrollment.institution.name} (${numAccounts} accounts)`);
            console.log("TellerConnect: Successfully saved enrollment with", numAccounts, "accounts");
            
            // Refresh the accounts list
            refreshAccounts();
          } catch (error: any) {
            console.error('TellerConnect: Error saving enrollment:', error);
            toast.error(error.message || 'Failed to save bank connection');
          }
        },
        onExit: () => {
          console.log('TellerConnect: User closed dialog');
          setLoading(false);
        },
      });
      
      setTellerConnectInstance(tellerConnect);
    } catch (error) {
      console.error('TellerConnect: Error setting up:', error);
      toast.error('Failed to initialize bank connection service');
    }
  }, [scriptLoaded, userId, refreshAccounts]);

  const handleConnectBank = () => {
    if (!tellerConnectInstance) {
      toast.error('Bank connection service is not ready');
      return;
    }
    
    if (accountCount >= MAX_ACCOUNTS) {
      toast.error(`Maximum limit of ${MAX_ACCOUNTS} accounts reached. Please remove an account before adding a new one.`);
      return;
    }
    
    setLoading(true);
    try {
      console.log("TellerConnect: Opening dialog");
      tellerConnectInstance.open();
    } catch (error) {
      console.error('TellerConnect: Error opening dialog:', error);
      toast.error('Failed to open bank connection dialog');
      setLoading(false);
    }
  };

  let buttonText = 'Connect Your Bank';
  let isDisabled = loading || !tellerConnectInstance;
  
  if (accountCount >= MAX_ACCOUNTS) {
    buttonText = 'Maximum Accounts Reached';
    isDisabled = true;
  } else if (loading) {
    buttonText = 'Connecting...';
  } else if (!tellerConnectInstance) {
    buttonText = scriptError ? 'Service Unavailable' : 'Loading...';
  }

  return (
    <div className="my-6">
      <button
        onClick={handleConnectBank}
        disabled={isDisabled}
        className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-70 font-medium text-lg transition-colors"
      >
        {loading && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
        )}
        {buttonText}
      </button>
      <p className="mt-2 text-sm text-gray-600">
        Your credentials are securely handled and never stored on our servers.
      </p>
    </div>
  );
} 