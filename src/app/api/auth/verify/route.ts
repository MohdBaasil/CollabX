import { NextResponse } from 'next/server';
import { dbService } from '@/lib/dbService';
import { signToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    const verificationToken = await dbService.getVerificationToken(email, token);
    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    // Mark email as verified
    const user = await dbService.verifyUserEmail(email);

    // Clean up verification token
    await dbService.deleteVerificationToken(email, token);

    // Auto-login after successful verification
    const sessionToken = await signToken({ userId: user.id, email: user.email }, '7d');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await dbService.createSession(user.id, sessionToken, expiresAt);

    const response = NextResponse.json({
      message: 'Email verified successfully. You are now logged in.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        theme: user.theme,
      },
    }, { status: 200 });

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
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
