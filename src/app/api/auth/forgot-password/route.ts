import { NextResponse } from 'next/server';
import { dbService } from '@/lib/dbService';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await dbService.findUserByEmail(email);

    // If user exists, create reset token and mock-send.
    // If not, we return a success response anyway to avoid email enumeration.
    if (user) {
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await dbService.createPasswordResetToken(email, resetToken, expiresAt);
      await sendPasswordResetEmail(email, resetToken);
    }

    return NextResponse.json({
      message: 'If a matching account exists, a password reset link has been logged to the console.',
    }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
