import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const comment = await dbService.createComment(taskId, payload.userId, text);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
