import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const file = await dbService.getProjectFileDetail(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('Fetch file detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { size, mimeType, url } = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const version = await dbService.createNewFileVersion(
      fileId,
      payload.userId,
      size || 0,
      mimeType || 'application/octet-stream',
      url || '#'
    );

    return NextResponse.json(version);
  } catch (error: any) {
    console.error('Create version error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
