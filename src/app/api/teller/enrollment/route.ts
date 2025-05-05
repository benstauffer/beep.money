import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAccounts } from '@/lib/teller';

export async function POST(request: Request) {
  try {
    const { accessToken, enrollmentId, userId, institutionName } = await request.json();

    if (!accessToken || !enrollmentId || !userId || !institutionName) {
      return NextResponse.json(
        { 
          error: { 
            code: 'missing_fields',
            message: 'Missing required fields'
          } 
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // First, save the enrollment to the database without fetching accounts
    // This ensures we capture the enrollment even if the Teller API call fails
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('teller_enrollments')
      .insert({
        user_id: userId,
        enrollment_id: enrollmentId,
        access_token: accessToken,
        institution_name: institutionName,
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('Error saving enrollment:', enrollmentError);
      return NextResponse.json(
        { 
          error: { 
            code: 'database_error',
            message: 'Failed to save enrollment' 
          } 
        },
        { status: 500 }
      );
    }

    // After saving the enrollment, attempt to fetch accounts
    // But don't require this to succeed
    try {
      console.log('Enrollment saved. Fetching accounts with access token:', accessToken.substring(0, 10) + '...');
      const accounts = await getAccounts(accessToken);
      console.log(`Retrieved ${accounts.length} accounts from Teller`);

      // Check if the teller_accounts table exists
      const { error: tableCheckError } = await supabase
        .from('teller_accounts')
        .select('id')
        .limit(1);

      // Save each account to the database
      if (!tableCheckError) {
        // Create the accounts in the database
        for (const account of accounts) {
          const { error: accountError } = await supabase
            .from('teller_accounts')
            .insert({
              user_id: userId,
              enrollment_id: enrollment.id,
              account_id: account.id,
              account_name: account.name,
              account_type: account.type,
              account_subtype: account.subtype,
              last_four: account.last_four,
              institution_name: institutionName
            });

          if (accountError) {
            console.error('Error saving account:', accountError, account);
          }
        }
      } else {
        console.log('teller_accounts table does not exist or is not accessible');
      }

      // Return success with account information 
      return NextResponse.json({ 
        success: true, 
        enrollment, 
        accounts: accounts.map(account => ({
          id: account.id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          last_four: account.last_four
        }))
      });
      
    } catch (tellerError: any) {
      // If fetching accounts fails, still return success for the enrollment
      console.error('Error fetching accounts from Teller. Continuing anyway:', tellerError.message);
      
      return NextResponse.json({ 
        success: true, 
        enrollment,
        accounts: [],
        warning: 'Enrollment was saved but could not fetch accounts. You may need to reconnect later.'
      });
    }
  } catch (error: any) {
    console.error('Error in enrollment route:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'server_error',
          message: 'Internal server error: ' + (error.message || 'Unknown error')
        } 
      },
      { status: 500 }
    );
  }
} 