// app/api/create-test-conversation/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create a test conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert([{
        participant1_id: user.id,
        participant2_id: user.id, // For testing, creating a conversation with self
      }])
      .select('*')
      .single();

    if (conversationError) {
      console.error('Conversation creation error:', conversationError);
      return NextResponse.json(
        { error: conversationError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(conversation);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}