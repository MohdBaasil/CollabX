import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { theme } = await request.json();
    if (theme !== 'light' && theme !== 'dark') {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
    }

    const user = await dbService.updateUserTheme(payload.userId, theme);

    return NextResponse.json({
      message: 'Theme preference updated',
      user: {
        id: user.id,
        email: user.email,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Update theme error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
