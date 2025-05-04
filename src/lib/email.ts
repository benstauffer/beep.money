import { Resend } from 'resend';
import { SpendingReportEmail, SpendingReportEmailProps } from '@/emails/SpendingReport';
import { renderAsync } from '@react-email/components';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSpendingReport(
  email: string,
  data: SpendingReportEmailProps
) {
  try {
    const html = await renderAsync(SpendingReportEmail(data));
    
    const { data: emailData, error } = await resend.emails.send({
      from: 'Beep Money <reports@beep.money>',
      to: email,
      subject: `Your ${data.period} Spending Report`,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return emailData;
  } catch (error) {
    console.error('Error in sendSpendingReport:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(email: string, firstName: string = 'there') {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Beep Money <welcome@beep.money>',
      to: email,
      subject: 'Welcome to Beep Money!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center; margin-top: 30px;">Welcome to Beep Money!</h1>
          <p style="color: #444; font-size: 16px; line-height: 24px;">Hi ${firstName},</p>
          <p style="color: #444; font-size: 16px; line-height: 24px;">Thanks for subscribing to our spending insights newsletter. We're excited to help you gain better control over your finances.</p>
          <p style="color: #444; font-size: 16px; line-height: 24px;">To get the most out of our service, connect your bank accounts through our secure platform, and we'll send you personalized insights about your spending habits.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Connect Your Accounts</a>
          </div>
          <p style="color: #444; font-size: 16px; line-height: 24px;">We're looking forward to helping you on your financial journey!</p>
          <p style="color: #444; font-size: 16px; line-height: 24px;">Best regards,<br>The Beep Money Team</p>
          <div style="text-align: center; margin-top: 40px; color: #999; font-size: 14px;">
            © ${new Date().getFullYear()} Beep Money. All rights reserved.
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
    throw error;
  }
} 