import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback?provider=github`;

  if (!clientId) {
    // If credentials are not configured, redirect to developer mock page
    return NextResponse.redirect(
      new URL('/oauth-mock?provider=github', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }

  // Real GitHub OAuth redirect URL
  const githubAuthUrl = `https://github.com/login/oauth/authorize?` + 
    `client_id=${encodeURIComponent(clientId)}` + 
    `&redirect_uri=${encodeURIComponent(redirectUri)}` + 
    `&scope=user:email` + 
    `&state=github_auth_state`;

  return NextResponse.redirect(githubAuthUrl);
}
