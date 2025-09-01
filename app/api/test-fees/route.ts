import { NextRequest } from "next/server";
import { calculateApplicationFee, getFeeBreakdown, formatFeeBreakdown, validateFeeAmount } from "@/lib/stripeFees";

/**
 * Test endpoint for fee calculations
 * Usage: GET /api/test-fees?amount=7500
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amountParam = searchParams.get('amount');

  if (!amountParam) {
    return new Response(
      JSON.stringify({ 
        error: "Missing 'amount' parameter. Usage: /api/test-fees?amount=7500" 
      }), 
      { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }

  const amountCents = parseInt(amountParam, 10);

  if (isNaN(amountCents) || amountCents <= 0) {
    return new Response(
      JSON.stringify({ 
        error: "Invalid amount. Must be a positive number in cents." 
      }), 
      { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }

  try {
    const applicationFee = calculateApplicationFee(amountCents);
    const breakdown = getFeeBreakdown(amountCents);
    const formatted = formatFeeBreakdown(breakdown);
    const isValid = validateFeeAmount(amountCents, applicationFee);

    return new Response(
      JSON.stringify({
        input: {
          amountCents,
          amountDollars: `$${(amountCents / 100).toFixed(2)}`
        },
        calculations: {
          applicationFee,
          applicationFeeDollars: `$${(applicationFee / 100).toFixed(2)}`,
          coachReceives: breakdown.coachAmount,
          coachReceivesDollars: `$${(breakdown.coachAmount / 100).toFixed(2)}`,
          isValid
        },
        breakdown,
        formatted,
        feePolicy: {
          percentage: `${(breakdown.feePercentage * 100).toFixed(1)}%`,
          fixedFee: `$${(breakdown.fixedFeeCents / 100).toFixed(2)}`,
          description: formatted.feeDescription
        }
      }, null, 2),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Fee calculation failed" 
      }), 
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}