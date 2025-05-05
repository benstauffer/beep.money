"use client"

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { useAccounts } from '@/lib/contexts/AccountsContext';

interface BankAccount {
  id: string;
  enrollment_id: string;
  institution_name: string;
  account_id: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
  last_four?: string;
  created_at: string;
}

// Set account limit constant
export const MAX_ACCOUNTS = 3;

export default function AccountsList() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshTrigger } = useAccounts();
  const supabase = createClient();

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          console.warn('No authenticated user');
          return;
        }
        
        // Query for teller_accounts instead of teller_enrollments
        const { data, error } = await supabase
          .from('teller_accounts')
          .select('*, teller_enrollments(institution_name)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching accounts:', error);
          // Fall back to enrollments if teller_accounts doesn't exist
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('teller_enrollments')
            .select('id, institution_name, created_at')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
            
          if (enrollmentsError) {
            throw enrollmentsError;
          }
          
          setAccounts(enrollmentsData?.map(e => ({
            id: e.id,
            enrollment_id: e.id,
            institution_name: e.institution_name,
            account_id: e.id,
            account_name: e.institution_name,
            account_type: 'unknown',
            created_at: e.created_at
          })) || []);
        } else {
          // Process data from teller_accounts
          setAccounts(data?.map(account => ({
            id: account.id,
            enrollment_id: account.enrollment_id,
            institution_name: account.teller_enrollments?.institution_name || 'Unknown Institution',
            account_id: account.account_id,
            account_name: account.account_name,
            account_type: account.account_type,
            account_subtype: account.account_subtype,
            last_four: account.last_four,
            created_at: account.created_at
          })) || []);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load your connected accounts');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAccounts();
  }, [refreshTrigger]);

  const handleRemoveAccount = async (accountId: string, enrollmentId: string) => {
    try {
      // First try to remove from teller_accounts
      const { error: accountError } = await supabase
        .from('teller_accounts')
        .delete()
        .eq('id', accountId);
      
      if (accountError) {
        console.error('Error removing account:', accountError);
        
        // If that fails, try to remove the enrollment
        const { error: enrollmentError } = await supabase
          .from('teller_enrollments')
          .delete()
          .eq('id', enrollmentId);
        
        if (enrollmentError) {
          throw enrollmentError;
        }
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

  // Group accounts by institution
  const accountsByInstitution = accounts.reduce((grouped, account) => {
    const institution = account.institution_name;
    if (!grouped[institution]) {
      grouped[institution] = [];
    }
    grouped[institution].push(account);
    return grouped;
  }, {} as Record<string, BankAccount[]>);

  return (
    <div className="space-y-4">
      {Object.entries(accountsByInstitution).map(([institution, institutionAccounts]) => (
        <div key={institution} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 font-medium text-gray-800 border-b border-gray-200">
            {institution}
          </div>
          
          {institutionAccounts.map((account) => (
            <div 
              key={account.id} 
              className="bg-white border-b last:border-b-0 border-gray-200 p-4 flex justify-between items-center"
            >
              <div>
                <h3 className="font-medium text-gray-800">
                  {account.account_name || `${account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} Account`}
                  {account.last_four && <span className="text-gray-500 ml-2">••••{account.last_four}</span>}
                </h3>
                <p className="text-sm text-gray-500">
                  {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                  {account.account_subtype && ` • ${account.account_subtype}`}
                </p>
              </div>
              
              <button
                onClick={() => handleRemoveAccount(account.id, account.enrollment_id)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ))}
      
      {/* Show account limit info */}
      <div className="mt-2 text-sm text-gray-500 flex justify-between items-center">
        <span>
          {accounts.length} of {MAX_ACCOUNTS} accounts connected
        </span>
        {accounts.length >= MAX_ACCOUNTS && (
          <span className="text-amber-600 font-medium">
            Maximum limit reached
          </span>
        )}
      </div>
    </div>
  );
} 