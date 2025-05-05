import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTransactions, getAccounts } from '@/lib/teller';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all user's Teller enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('teller_enrollments')
      .select('*')
      .eq('user_id', user.id);

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      return NextResponse.json(
        { message: 'Error fetching enrollments' },
        { status: 500 }
      );
    }

    // Calculate date ranges
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Initialize spending totals
    let dailyTotal = 0;
    let weeklyTotal = 0;
    let monthlyTotal = 0;

    // Fetch transactions for each enrollment
    for (const enrollment of enrollments || []) {
      try {
        // Get all accounts for this enrollment
        const accounts = await getAccounts(enrollment.access_token);
        
        // Fetch transactions for each account
        for (const account of accounts) {
          // Get transactions for the last 30 days
          const transactions = await getTransactions(
            enrollment.access_token,
            account.id,
            {
              from: thirtyDaysAgo.toISOString().split('T')[0],
              to: now.toISOString().split('T')[0]
            }
          );

          // Process transactions
          for (const tx of transactions) {
            const txDate = new Date(tx.date);
            const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
            const absAmount = Math.abs(amount); // Convert to positive number for spending

            // Only count negative amounts (spending)
            if (amount < 0) {
              // Daily total (yesterday)
              if (txDate >= yesterday) {
                dailyTotal += absAmount;
              }
              
              // Weekly total (last 7 days)
              if (txDate >= sevenDaysAgo) {
                weeklyTotal += absAmount;
              }
              
              // Monthly total (last 30 days)
              if (txDate >= thirtyDaysAgo) {
                monthlyTotal += absAmount;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing enrollment:', error);
        // Continue with other enrollments even if one fails
        continue;
      }
    }

    // Format currency
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    return NextResponse.json({
      dailySpend: formatter.format(dailyTotal),
      weeklySpend: formatter.format(weeklyTotal),
      monthlySpend: formatter.format(monthlyTotal)
    });

  } catch (error) {
    console.error('Error in transaction summary route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 