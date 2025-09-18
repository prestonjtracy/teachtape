import { NextRequest, NextResponse } from "next/server";
import { createClientForApiRoute } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClientForApiRoute(req);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    // Get recent system messages with Zoom content
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('kind', 'system')
      .ilike('body', '%zoom%')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      messages: messages
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}