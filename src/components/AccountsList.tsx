"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  institution_name: string;
  created_at: string;
  last_fetched?: string;
}

export default function AccountsList() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          console.warn('No authenticated user');
          return;
        }
        
        const { data, error } = await supabase
          .from('teller_enrollments')
          .select('id, institution_name, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setAccounts(data || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load your connected accounts');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAccounts();
  }, []);

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('teller_enrollments')
        .delete()
        .eq('id', accountId);
      
      if (error) {
        throw error;
      }
      
      // Update the local state
      setAccounts(accounts.filter(account => account.id !== accountId));
      toast.success('Account removed successfully');
    } catch (error) {
      console.error('Error removing account:', error);
      toast.error('Failed to remove account');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded dark:bg-gray-700"></div>
        <div className="h-12 bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          You haven't connected any bank accounts yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <div 
          key={account.id} 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-between items-center shadow-sm"
        >
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {account.institution_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connected on {new Date(account.created_at).toLocaleDateString()}
            </p>
          </div>
          
          <button
            onClick={() => handleRemoveAccount(account.id)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
} 