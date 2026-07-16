import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'collabspace_super_secret_session_token_key_for_jwt_auth_12345';
const encodedSecret = new TextEncoder().encode(SECRET_KEY);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('collabspace-session')?.value;

  let isValid = false;

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, encodedSecret);
      isValid = !!payload;
    } catch (error) {
      isValid = false;
    }
  }

  const isAuthPage = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/signup') || 
    pathname.startsWith('/forgot-password') || 
    pathname.startsWith('/reset-password') || 
    pathname.startsWith('/verify-email');
    
  const isProtectedPage = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/profile');

  if (isProtectedPage && !isValid) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(url);
    
    if (sessionCookie) {
      response.cookies.delete('collabspace-session');
    }
    return response;
  }

  if (isAuthPage && isValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Security Headers implementation
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:;"
  );

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email'
  ]
};
