import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback?provider=google`;

  if (!clientId) {
    // If credentials are not configured, redirect to developer mock page
    return NextResponse.redirect(
      new URL('/oauth-mock?provider=google', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }

  // Real Google OAuth redirect URL
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${encodeURIComponent(clientId)}` + 
    `&redirect_uri=${encodeURIComponent(redirectUri)}` + 
    `&response_type=code` + 
    `&scope=openid%20email%20profile` + 
    `&state=google_auth_state`;

  return NextResponse.redirect(googleAuthUrl);
}
