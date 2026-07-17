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

    // Check if user is already a member
    const isMember = project.members.some((m: any) => m.userId === payload.userId);
    if (isMember) {
      return NextResponse.json({ success: true, message: 'Already a member' });
    }

    // Add current user to project as editor
    const user = await dbService.findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await dbService.addProjectMember(projectId, user.email, 'editor', payload.userId);

    return NextResponse.json({ success: true, message: 'Successfully joined project' });
  } catch (error: any) {
    console.error('Join project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
