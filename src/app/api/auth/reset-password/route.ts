import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { dbService } from '@/lib/dbService';

export async function POST(request: Request) {
  try {
    const { email, token, password } = await request.json();

    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Email, token, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const resetToken = await dbService.getPasswordResetToken(email, token);
    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await hash(password, 10);

    // Update password
    await dbService.updateUserPassword(email, passwordHash);

    // Delete reset token
    await dbService.deletePasswordResetToken(email, token);

    return NextResponse.json({
      message: 'Password reset successful. You can now log in with your new password.',
    }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
