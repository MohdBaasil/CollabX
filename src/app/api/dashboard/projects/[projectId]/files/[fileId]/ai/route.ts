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
    const { action } = await request.json(); // summary or ocr

    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let result = '';

    if (action === 'summary') {
      result = await dbService.runAiDocumentSummary(fileId);
    } else if (action === 'ocr') {
      result = await dbService.runAiOcr(fileId);
    } else {
      return NextResponse.json({ error: 'Invalid AI action' }, { status: 400 });
    }

    return NextResponse.json({ answer: result });
  } catch (error: any) {
    console.error('File AI operation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
