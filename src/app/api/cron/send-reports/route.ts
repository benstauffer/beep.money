import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSpendingReport } from '@/lib/reports';
import { sendSpendingReport } from '@/lib/email';

// This secret should be set in your environment variables for security
const CRON_SECRET = process.env.CRON_SECRET;

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
          
          // Send the email
          await sendSpendingReport(user.email, report);
          
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