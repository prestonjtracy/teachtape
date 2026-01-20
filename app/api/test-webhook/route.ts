import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log("🧪 Test webhook endpoint called");

  try {
    // Test Supabase connection
    const supabase = await createClient();
    
    // Test a simple query to verify connection
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .limit(1);
    
    if (error) {
      console.error("❌ Supabase connection test failed:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    console.log("✅ Supabase connection test successful");
    console.log("📊 Current bookings count:", data?.length || 0);
    
    // Try to insert a test booking to see the exact schema
    console.log("🧪 Attempting test booking insert...");
    const testBooking = {
      listing_id: "00000000-0000-0000-0000-000000000000",
      coach_id: "00000000-0000-0000-0000-000000000000", 
      customer_email: "test@example.com",
      amount_paid_cents: 1000,
      status: "paid", // Use valid status
      stripe_session_id: "test_session_123",
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour later
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from("bookings")
      .insert(testBooking)
      .select();
    
    if (insertError) {
      console.error("❌ Test booking insert failed:", insertError);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Connection test successful, but insert failed",
        supabaseConnection: "✅",
        currentBookings: data?.length || 0,
        insertError: insertError.message,
        insertDetails: insertError
      }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    console.log("✅ Test booking insert successful:", insertData);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Webhook test successful",
      supabaseConnection: "✅",
      currentBookings: data?.length || 0,
      testInsert: "✅"
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
    
  } catch (err) {
    console.error("❌ Test webhook error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Unexpected error",
      details: err
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
