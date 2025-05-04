import { Transaction } from '@/emails/SpendingReport';
import { TellerTransaction, getAccounts, getTransactions } from './teller';
import { supabase } from './supabase';

export interface SpendingReport {
  firstName: string;
  transactions: Transaction[];
  totalSpent: number;
  period: string;
  topCategories: { name: string; amount: number }[];
}

// Helper to get the date range for a period
function getDateRange(period: 'week' | 'month' | 'year'): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  
  let from: string;
  if (period === 'week') {
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    from = lastWeek.toISOString().split('T')[0];
  } else if (period === 'month') {
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    from = lastMonth.toISOString().split('T')[0];
  } else {
    // year
    const lastYear = new Date(now);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    from = lastYear.toISOString().split('T')[0];
  }
  
  return { from, to };
}

// Convert Teller transactions to our format
function convertTransactions(tellerTransactions: TellerTransaction[]): Transaction[] {
  return tellerTransactions.map(tx => ({
    id: tx.id,
    date: tx.date,
    description: tx.description,
    amount: Math.abs(tx.amount), // Use absolute value for reporting
    category: tx.details?.category,
  }));
}

// Calculate top categories from transactions
function calculateTopCategories(transactions: Transaction[], limit = 5): { name: string; amount: number }[] {
  const categories: Record<string, number> = {};
  
  // Sum up amounts by category
  transactions.forEach(tx => {
    const category = tx.category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category] += tx.amount;
  });
  
  // Convert to array and sort
  const sortedCategories = Object.entries(categories)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
  
  return sortedCategories;
}

// Calculate total spent
function calculateTotalSpent(transactions: Transaction[]): number {
  return transactions.reduce((total, tx) => total + tx.amount, 0);
}

// Get the user's first name
async function getUserFirstName(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('first_name, email')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user details:', error);
      return 'there';
    }
    
    return data.first_name || data.email.split('@')[0] || 'there';
  } catch (error) {
    console.error('Error in getUserFirstName:', error);
    return 'there';
  }
}

// Generate a spending report for a user for a specific period
export async function generateSpendingReport(
  userId: string,
  period: 'week' | 'month' | 'year' = 'week'
): Promise<SpendingReport | null> {
  try {
    // Get the user's enrollments
    const { data: enrollments, error } = await supabase
      .from('teller_enrollments')
      .select('id, access_token')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching enrollments:', error);
      return null;
    }
    
    if (!enrollments || enrollments.length === 0) {
      console.warn('No enrollments found for user:', userId);
      return null;
    }
    
    // Get the date range for the period
    const { from, to } = getDateRange(period);
    
    // Fetch all transactions for all accounts
    let allTransactions: TellerTransaction[] = [];
    
    for (const enrollment of enrollments) {
      // Get all accounts for this enrollment
      const accounts = await getAccounts(enrollment.access_token);
      
      // Get transactions for each account
      for (const account of accounts) {
        const transactions = await getTransactions(
          enrollment.access_token,
          account.id,
          { from, to }
        );
        
        allTransactions = [...allTransactions, ...transactions];
      }
    }
    
    // Filter transactions for expenses only (negative amounts in Teller are expenses)
    const expenseTransactions = allTransactions.filter(tx => tx.amount < 0);
    
    // Convert Teller transactions to our format
    const formattedTransactions = convertTransactions(expenseTransactions);
    
    // Calculate top spending categories
    const topCategories = calculateTopCategories(formattedTransactions);
    
    // Calculate total spent
    const totalSpent = calculateTotalSpent(formattedTransactions);
    
    // Get the user's first name
    const firstName = await getUserFirstName(userId);
    
    // Format period string
    const periodText = period === 'week' ? 'this week' : 
                       period === 'month' ? 'this month' : 
                       'this year';
    
    return {
      firstName,
      transactions: formattedTransactions.slice(0, 10), // Just include the 10 most recent transactions
      totalSpent,
      period: periodText,
      topCategories,
    };
  } catch (error) {
    console.error('Error generating spending report:', error);
    return null;
  }
} 