import { NextRequest } from "next/server";
import { getAvailabilitiesForCoach } from "@/lib/db/booking";
import { z } from "zod";

const QuerySchema = z.object({
  coachId: z.string().uuid("Invalid coach ID"),
  from: z.string().datetime("Invalid from date"),
  to: z.string().datetime("Invalid to date")
});

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  console.log(`🔍 [GET /api/availabilities] Request received`);
  
  try {
    const url = new URL(req.url);
    const queryParams = {
      coachId: url.searchParams.get('coachId'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to')
    };

    // Validate query parameters
    const validatedParams = QuerySchema.parse(queryParams);
    console.log(`✅ [GET /api/availabilities] Parameters validated:`, {
      coachId: validatedParams.coachId,
      from: validatedParams.from,
      to: validatedParams.to
    });

    const fromDate = new Date(validatedParams.from);
    const toDate = new Date(validatedParams.to);
    
    const result = await getAvailabilitiesForCoach(
      validatedParams.coachId,
      fromDate,
      toDate
    );

    if (!result.success) {
      console.error(`❌ [GET /api/availabilities] Database error:`, result.error);
      return new Response(
        JSON.stringify({ 
          error: result.error,
          availabilities: []
        }), 
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`✅ [GET /api/availabilities] Found ${result.data.length} availabilities`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        availabilities: result.data
      }), 
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [GET /api/availabilities] Validation error:`, error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request parameters",
          details: error.errors,
          availabilities: []
        }), 
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    console.error(`❌ [GET /api/availabilities] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        availabilities: []
      }), 
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}