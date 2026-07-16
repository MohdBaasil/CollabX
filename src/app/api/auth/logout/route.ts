import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbService } from '@/lib/dbService';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (token) {
      // Invalidate in DB
      await dbService.deleteSession(token);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear session cookie
    response.cookies.set({
      name: 'collabspace-session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Immediately expire
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
