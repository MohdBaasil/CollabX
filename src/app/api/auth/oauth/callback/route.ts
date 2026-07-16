import { NextResponse } from 'next/server';
import { dbService } from '@/lib/dbService';
import { signToken } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const code = searchParams.get('code');
    const mock = searchParams.get('mock');

    if (!provider) {
      return NextResponse.json({ error: 'OAuth provider is required' }, { status: 400 });
    }

    let email = '';
    let name = '';
    let avatarUrl = '';
    let providerAccountId = '';

    // MOCK MODE FALLBACK
    if (mock === 'true') {
      email = searchParams.get('email') || '';
      name = searchParams.get('name') || '';
      avatarUrl = searchParams.get('avatarUrl') || '';
      providerAccountId = searchParams.get('providerAccountId') || `mock-${Date.now()}`;

      if (!email) {
        return NextResponse.json({ error: 'Mock email is required' }, { status: 400 });
      }
    } else {
      // REAL MODE
      if (!code) {
        return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
      }

      if (provider === 'google') {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback?provider=google`,
          }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
          throw new Error(`Google token exchange error: ${tokenData.error_description || tokenData.error}`);
        }

        // Decode id_token or fetch userinfo
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileResponse.json();

        email = profile.email;
        name = profile.name || profile.given_name || '';
        avatarUrl = profile.picture || '';
        providerAccountId = profile.id;

      } else if (provider === 'github') {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID || '',
            client_secret: process.env.GITHUB_CLIENT_SECRET || '',
            code,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback?provider=github`,
          }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
          throw new Error(`GitHub token exchange error: ${tokenData.error_description || tokenData.error}`);
        }

        // Fetch profile
        const profileResponse = await fetch('https://api.github.com/user', {
          headers: { 
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'CollabSpace-App'
          },
        });
        const profile = await profileResponse.json();

        // Fetch emails if public email is not set
        if (!profile.email) {
          const emailResponse = await fetch('https://api.github.com/client/user/emails', {
            headers: { 
              Authorization: `Bearer ${tokenData.access_token}`,
              'User-Agent': 'CollabSpace-App'
            },
          });
          const emails = await emailResponse.json();
          const primaryEmail = emails.find((e: any) => e.primary && e.verified)?.email;
          email = primaryEmail || emails[0]?.email || '';
        } else {
          email = profile.email;
        }

        name = profile.name || profile.login || '';
        avatarUrl = profile.avatar_url || '';
        providerAccountId = String(profile.id);
      } else {
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Could not retrieve email from OAuth provider' }, { status: 400 });
    }

    // Process user registration or retrieval
    let user = await dbService.findUserByEmail(email);

    if (!user) {
      // Create a new user (pre-verified since it comes from trusted OAuth)
      user = await dbService.createUser({
        email,
        name,
        avatarUrl,
        emailVerified: true,
      });

      // Link OAuth account
      await dbService.linkOAuthAccount(user.id, provider, providerAccountId);
    } else {
      // User exists, check if account is linked. If not, link it.
      await dbService.linkOAuthAccount(user.id, provider, providerAccountId);
      
      // Auto verify user if they were unverified previously
      if (!user.emailVerified) {
        await dbService.verifyUserEmail(email);
      }
      
      // Update avatar if they had none
      if (!user.avatarUrl && avatarUrl) {
        await dbService.updateUserProfile(user.id, { avatarUrl });
      }
    }

    // Generate JWT Session Token
    const sessionToken = await signToken({ userId: user.id, email: user.email }, '7d');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await dbService.createSession(user.id, sessionToken, expiresAt);

    // Redirect user to dashboard setting cookie
    const response = NextResponse.redirect(
      new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );

    response.cookies.set({
      name: 'collabspace-session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('OAuth Callback error:', error);
    // Redirect user back to login with error details
    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    loginUrl.searchParams.set('error', error.message || 'OAuth exchange failed');
    return NextResponse.redirect(loginUrl);
  }
}
