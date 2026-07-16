import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { dbService } from '@/lib/dbService';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const existingUser = await dbService.findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    // Create user
    const user = await dbService.createUser({
      email,
      passwordHash,
      name: name || null,
      emailVerified: false, // Must verify email first
    });

    // Create verification token (simple random hex)
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await dbService.createVerificationToken(email, verificationToken, expiresAt);

    // Send verification email mock
    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json({
      message: 'Registration successful. Verification email sent.',
      userId: user.id,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
