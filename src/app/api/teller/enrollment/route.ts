import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const enrollmentSchema = z.object({
  accessToken: z.string(),
  enrollmentId: z.string(),
  userId: z.string(),
  institutionName: z.string(),
});

export async function POST(request: Request) {
  try {
    console.log("API: Received enrollment request");
    
    // Parse request body
    const body = await request.json();
    console.log("API: Request body", JSON.stringify({
      ...body,
      accessToken: body.accessToken ? '[REDACTED]' : undefined
    }));
    
    const { accessToken, enrollmentId, userId, institutionName } = enrollmentSchema.parse(body);
    
    // Verify we have a user ID
    if (!userId) {
      console.error("API: Missing user ID");
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // First, check if the user exists
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error("API: Error checking user", userError);
      
      // If user doesn't exist, create the user
      if (userError.code === 'PGRST116') {
        const { error: createUserError } = await supabase
          .from('users')
          .insert([{ 
            id: userId, 
            email: 'unknown@example.com' // Placeholder, should be updated later
          }]);
        
        if (createUserError) {
          console.error("API: Failed to create user", createUserError);
          return NextResponse.json(
            { message: 'User does not exist and could not be created', error: createUserError.message },
            { status: 500 }
          );
        }
        
        console.log("API: Created new user with ID", userId);
      } else {
        return NextResponse.json(
          { message: 'Failed to check if user exists', error: userError.message },
          { status: 500 }
        );
      }
    }
    
    // Check if this enrollment already exists
    const { data: existingEnrollment, error: findError } = await supabase
      .from('teller_enrollments')
      .select('id')
      .eq('enrollment_id', enrollmentId)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      console.error("API: Error checking existing enrollment", findError);
      return NextResponse.json(
        { message: 'Failed to check existing enrollment', error: findError.message },
        { status: 500 }
      );
    }
    
    if (existingEnrollment) {
      console.log("API: Updating existing enrollment", existingEnrollment.id);
      
      // Update the existing enrollment
      const { error: updateError } = await supabase
        .from('teller_enrollments')
        .update({
          access_token: accessToken,
          institution_name: institutionName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEnrollment.id);
      
      if (updateError) {
        console.error("API: Error updating enrollment", updateError);
        return NextResponse.json(
          { message: 'Failed to update bank connection', error: updateError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { message: 'Bank connection updated successfully', enrollmentId: existingEnrollment.id },
        { status: 200 }
      );
    }
    
    console.log("API: Creating new enrollment for user", userId);
    
    // Create a new enrollment
    const { data: newEnrollment, error: createError } = await supabase
      .from('teller_enrollments')
      .insert([{
        user_id: userId,
        enrollment_id: enrollmentId,
        access_token: accessToken,
        institution_name: institutionName,
      }])
      .select()
      .single();
    
    if (createError) {
      console.error("API: Error creating enrollment", createError);
      return NextResponse.json(
        { message: 'Failed to save bank connection', error: createError.message },
        { status: 500 }
      );
    }
    
    console.log("API: Successfully created enrollment", newEnrollment.id);
    
    return NextResponse.json(
      { message: 'Bank connection saved successfully', enrollmentId: newEnrollment.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("API: Validation error", error.errors);
      return NextResponse.json(
        { message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }
    
    console.error("API: Unexpected error", error);
    return NextResponse.json(
      { message: 'An unexpected error occurred', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 