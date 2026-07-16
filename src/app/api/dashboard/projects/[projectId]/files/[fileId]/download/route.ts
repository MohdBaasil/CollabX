import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { version } = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const download = await dbService.logFileDownload(fileId, payload.userId, version || 1);
    return NextResponse.json(download);
  } catch (error) {
    console.error('Log file download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
