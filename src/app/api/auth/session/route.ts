import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      // Clear invalid cookie
      const response = NextResponse.json({ authenticated: false }, { status: 200 });
      response.cookies.delete('collabspace-session');
      return response;
    }

    const user = await dbService.findUserById(payload.userId);
    if (!user) {
      const response = NextResponse.json({ authenticated: false }, { status: 200 });
      response.cookies.delete('collabspace-session');
      return response;
    }

    const workspaces = await dbService.getUserWorkspaces(user.id);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        theme: user.theme,
        emailVerified: user.emailVerified,
      },
      workspaces,
    });
  } catch (error) {
    console.error('Session endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
