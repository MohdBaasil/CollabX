import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: 'Missing emoji' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reactions = await dbService.toggleReaction(messageId, payload.userId, emoji);
    return NextResponse.json(reactions);
  } catch (error: any) {
    console.error('Reaction toggle error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
