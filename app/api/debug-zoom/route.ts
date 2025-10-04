import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    
    console.log('🔍 [DEBUG] Zoom credentials check:');
    console.log('- CLIENT_ID exists:', !!clientId);
    console.log('- CLIENT_SECRET exists:', !!clientSecret);  
    console.log('- ACCOUNT_ID exists:', !!accountId);
    console.log('- CLIENT_ID length:', clientId?.length || 0);
    console.log('- CLIENT_SECRET length:', clientSecret?.length || 0);
    console.log('- ACCOUNT_ID length:', accountId?.length || 0);
    
    if (!clientId || !clientSecret || !accountId) {
      return NextResponse.json({
        success: false,
        error: 'Missing Zoom environment variables',
        details: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasAccountId: !!accountId
        }
      }, { status: 400 });
    }

    // Test the OAuth token request manually
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    console.log('🔐 [DEBUG] Testing OAuth token request...');
    
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: accountId,
      }),
    });
    
    const responseText = await response.text();
    console.log('📡 [DEBUG] Zoom API response status:', response.status);
    console.log('📡 [DEBUG] Zoom API response:', responseText);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Zoom API authentication failed',
        details: {
          status: response.status,
          response: responseText,
          credentials_format: 'Basic ' + credentials.slice(0, 20) + '...'
        }
      }, { status: 400 });
    }
    
    const data = JSON.parse(responseText);
    
    return NextResponse.json({
      success: true,
      message: 'Zoom API authentication successful!',
      details: {
        hasAccessToken: !!data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in
      }
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: { stack: error instanceof Error ? error.stack : null }
    }, { status: 500 });
  }
}