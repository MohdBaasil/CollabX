import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await dbService.getProjectDetails(projectId, payload.userId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check permissions (Viewer cannot duplicate)
    if (project.userRole === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot duplicate projects' }, { status: 403 });
    }

    const copy = await dbService.duplicateProject(projectId, payload.userId);

    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    console.error('Duplicate project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
