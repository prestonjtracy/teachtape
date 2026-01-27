import { NextRequest, NextResponse } from 'next/server'
import { getActiveCommissionSettings, getExtendedFeeBreakdown } from '@/lib/stripeFees'

export const dynamic = 'force-dynamic'

/**
 * GET /api/fee-breakdown?price_cents=1000
 * Returns the fee breakdown for a given price, including service fees
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const priceCents = parseInt(searchParams.get('price_cents') || '0', 10)

  if (priceCents <= 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  try {
    const settings = await getActiveCommissionSettings()
    const breakdown = getExtendedFeeBreakdown(priceCents, settings)

    return NextResponse.json({
      base_price_cents: breakdown.originalAmount,
      service_fee_cents: breakdown.athleteServiceFee,
      total_cents: breakdown.totalChargedToAthlete,
    })
  } catch (error) {
    console.error('Error calculating fee breakdown:', error)
    return NextResponse.json({ error: 'Failed to calculate fees' }, { status: 500 })
  }
}
