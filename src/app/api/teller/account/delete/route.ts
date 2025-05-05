import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(request: Request) {
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

    // Get account ID from request
    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get the account and verify ownership
    const { data: account, error: accountError } = await supabase
      .from('teller_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { message: 'Account not found or access denied' },
        { status: 404 }
      );
    }

    // Start a transaction to delete the account
    const { error: deleteError } = await supabase
      .from('teller_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      throw deleteError;
    }

    // Check if this was the last account for this enrollment
    const { data: remainingAccounts, error: remainingError } = await supabase
      .from('teller_accounts')
      .select('id')
      .eq('enrollment_id', account.enrollment_id);

    if (remainingError) {
      throw remainingError;
    }

    // If no accounts left, delete the enrollment
    if (!remainingAccounts || remainingAccounts.length === 0) {
      const { error: enrollmentError } = await supabase
        .from('teller_enrollments')
        .delete()
        .eq('id', account.enrollment_id);

      if (enrollmentError) {
        throw enrollmentError;
      }
    }

    return NextResponse.json({
      message: 'Account deleted successfully',
      wasLastAccount: !remainingAccounts || remainingAccounts.length === 0
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 