import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { dbService } from '@/lib/dbService';
import { signToken } from '@/lib/jwt';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await dbService.findUserByEmail(email);
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Re-send verification link to keep it friendly
      const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await dbService.createVerificationToken(email, verificationToken, expiresAt);
      await sendVerificationEmail(email, verificationToken);

      return NextResponse.json({
        error: 'Please verify your email. A verification link has been logged to the console.',
        unverified: true,
      }, { status: 403 });
    }

    // Sign session token
    const token = await signToken({ userId: user.id, email: user.email }, '7d');

    // Create session in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await dbService.createSession(user.id, token, expiresAt);

    // Build response and set HTTP-only cookie
    const response = NextResponse.json({
      message: 'Login successful',
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
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
