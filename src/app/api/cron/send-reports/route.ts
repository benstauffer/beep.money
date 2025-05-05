import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSpendingReport } from '@/lib/reports';
import { sendSpendingReport } from '@/lib/email';

// This secret should be set in your environment variables for security
const CRON_SECRET = process.env.CRON_SECRET;

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export async function GET(request: Request) {
  try {
    // Verify the cron job secret to prevent unauthorized access
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== CRON_SECRET) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get period parameter (default to weekly)
    const period = (searchParams.get('period') || 'week') as 'week' | 'month' | 'year';
    
    // Get users with Teller enrollments
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, 
        email,
        first_name,
        teller_enrollments:teller_enrollments(id)
      `)
      .not('teller_enrollments', 'is', null);
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { message: 'Failed to fetch users', error: error.message },
        { status: 500 }
      );
    }
    
    if (!users || users.length === 0) {
      return NextResponse.json(
        { message: 'No users with Teller enrollments found' },
        { status: 200 }
      );
    }
    
    // Send reports for each user
    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          // Generate the spending report
          const report = await generateSpendingReport(user.id, period);
          
          if (!report) {
            return { userId: user.id, status: 'skipped', reason: 'No report data' };
          }

          // Transform report data into email props format
          const emailData = {
            firstName: report.firstName,
            period: report.period,
            dailySpend: formatCurrency(report.transactions.filter(tx => {
              const txDate = new Date(tx.date);
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              return txDate.toDateString() === yesterday.toDateString();
            }).reduce((sum, tx) => sum + tx.amount, 0)),
            weeklySpend: formatCurrency(report.transactions.filter(tx => {
              const txDate = new Date(tx.date);
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              return txDate >= sevenDaysAgo;
            }).reduce((sum, tx) => sum + tx.amount, 0)),
            monthlySpend: formatCurrency(report.transactions.filter(tx => {
              const txDate = new Date(tx.date);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return txDate >= thirtyDaysAgo;
            }).reduce((sum, tx) => sum + tx.amount, 0)),
            thisWeekSpend: formatCurrency(report.transactions.filter(tx => {
              const txDate = new Date(tx.date);
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              weekStart.setHours(0, 0, 0, 0);
              return txDate >= weekStart;
            }).reduce((sum, tx) => sum + tx.amount, 0)),
            thisMonthSpend: formatCurrency(report.transactions.filter(tx => {
              const txDate = new Date(tx.date);
              const monthStart = new Date();
              monthStart.setDate(1);
              monthStart.setHours(0, 0, 0, 0);
              return txDate >= monthStart;
            }).reduce((sum, tx) => sum + tx.amount, 0))
          };
          
          // Send the email
          await sendSpendingReport(user.email, emailData);
          
          return { userId: user.id, status: 'sent' };
        } catch (error) {
          console.error(`Error sending report for user ${user.id}:`, error);
          return { 
            userId: user.id, 
            status: 'failed', 
            reason: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 'sent').length;
    const skippedCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 'skipped').length;
    const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')).length;
    
    return NextResponse.json({
      message: `Processed ${results.length} users`,
      summary: {
        total: results.length,
        sent: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Disable the default body parsing since we don't need it
export const config = {
  api: {
    bodyParser: false,
  },
}; 