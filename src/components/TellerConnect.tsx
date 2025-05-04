"use client"

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

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

  // Get the current user ID
  useEffect(() => {
    async function getUserId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        console.log("Got user ID:", session.user.id);
      } else {
        console.warn("No user session found");
      }
    }
    
    getUserId();
  }, []);

  // Load Teller Connect script
  useEffect(() => {
    if (scriptLoaded) return;
    
    const script = document.createElement('script');
    script.src = 'https://cdn.teller.io/connect/connect.js';
    script.async = false;
    script.onload = () => {
      console.log("Teller Connect script loaded");
      setScriptLoaded(true);
    };
    script.onerror = (e) => {
      console.error("Error loading Teller Connect script:", e);
    };
    
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, [scriptLoaded]);

  // Initialize Teller Connect
  useEffect(() => {
    if (!scriptLoaded || !window.TellerConnect || !userId) {
      if (!scriptLoaded) console.log("Script not loaded");
      if (!window.TellerConnect) console.log("TellerConnect not available");
      if (!userId) console.log("User ID not available");
      return;
    }
    
    // Get application ID from environment variable
    const applicationId = process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID;
    
    if (!applicationId) {
      console.error('Missing Teller application ID');
      return;
    }
    
    console.log("Initializing Teller Connect with app ID:", applicationId);
    
    try {
      const tellerConnect = window.TellerConnect.setup({
        applicationId: applicationId,
        environment: 'sandbox', // Hardcoded for safety, change based on environment needs
        products: ['transactions', 'balance'],
        selectAccount: 'multiple',
        onInit: () => {
          console.log('Teller Connect initialized');
        },
        onSuccess: async (enrollment) => {
          console.log('Enrollment successful', enrollment);
          
          try {
            console.log("Saving enrollment with user ID:", userId);
            
            const response = await fetch('/api/teller/enrollment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accessToken: enrollment.accessToken,
                enrollmentId: enrollment.enrollment.id,
                userId: userId, // Use the authenticated user's ID
                institutionName: enrollment.enrollment.institution.name,
              }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              console.error("API error:", data);
              throw new Error(data.message || 'Failed to save enrollment');
            }
            
            toast.success('Bank account connected successfully!');
          } catch (error) {
            console.error('Error saving enrollment:', error);
            toast.error('Failed to save bank connection');
          }
        },
        onExit: () => {
          console.log('User closed Teller Connect');
        },
      });
      
      setTellerConnectInstance(tellerConnect);
    } catch (error) {
      console.error('Error setting up Teller Connect:', error);
    }
  }, [scriptLoaded, userId]);

  const handleConnectBank = () => {
    if (!tellerConnectInstance) {
      toast.error('Teller Connect is not initialized');
      return;
    }
    
    setLoading(true);
    try {
      tellerConnectInstance.open();
    } catch (error) {
      console.error('Error opening Teller Connect:', error);
      toast.error('Failed to open bank connection dialog');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-6">
      <button
        onClick={handleConnectBank}
        disabled={loading || !tellerConnectInstance}
        className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 font-medium"
      >
        {loading ? 'Connecting...' : !tellerConnectInstance ? 'Loading...' : 'Connect Your Bank'}
      </button>
      <p className="mt-2 text-sm text-gray-600">
        Your credentials are securely handled and never stored on our servers.
      </p>
    </div>
  );
} 