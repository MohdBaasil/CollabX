import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || null;

    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await dbService.getProjectFilesAndFolders(projectId, folderId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch project files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if creating a folder or uploading a file
    if (body.folderName) {
      const folder = await dbService.createFolder(projectId, body.folderName);
      return NextResponse.json(folder);
    } else {
      const { name, size, mimeType, url, folderId } = body;
      if (!name) {
        return NextResponse.json({ error: 'Missing file name' }, { status: 400 });
      }

      const file = await dbService.createProjectFile(
        projectId,
        folderId || null,
        payload.userId,
        name,
        size || 0,
        mimeType || 'application/octet-stream',
        url || '#'
      );

      return NextResponse.json(file);
    }
  } catch (error) {
    console.error('Create folder/file error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
