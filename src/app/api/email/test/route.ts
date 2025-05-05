import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';
import SpendingReport from '@/emails/SpendingReport';
import { GET as getSpendingSummary } from '@/app/api/spending/summary/route';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
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

    // Get user's first name
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, email')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Get real spending data
    const spendingSummaryResponse = await getSpendingSummary();
    if (!spendingSummaryResponse.ok) {
      throw new Error('Failed to fetch spending summary');
    }
    const spendingData = await spendingSummaryResponse.json();

    // Prepare email data
    const emailData = {
      firstName: userData.first_name || 'there',
      ...spendingData
    };

    try {
      // Send email with real data
      const emailResponse = await resend.emails.send({
        from: 'Beep Money <hi@beep.money>',
        to: [userData.email],
        subject: '🧾 Your Spending Summary',
        react: SpendingReport(emailData)
      });

      // Log the email send
      await supabase
        .from('email_logs')
        .insert({
          user_id: user.id,
          email_type: 'spending_summary',
          status: 'sent',
          metadata: { emailResponse }
        });

      return NextResponse.json({ 
        message: 'Test email sent successfully',
        data: emailResponse
      });
    } catch (emailError: any) {
      console.error('Failed to send email:', emailError);
      return NextResponse.json(
        { 
          message: 'Failed to send email',
          error: emailError?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in test email route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 