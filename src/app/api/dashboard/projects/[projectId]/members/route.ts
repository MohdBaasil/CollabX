import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbService } from '@/lib/dbService';

// GET — List project members
export async function GET(
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

    return NextResponse.json(project.members || []);
  } catch (error) {
    console.error('Fetch project members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Add a member by email
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

    // Check permissions — only owner/admin can invite
    const project = await dbService.getProjectDetails(projectId, payload.userId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.userRole !== 'owner' && project.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only project owners and admins can invite members' }, { status: 403 });
    }

    const { email, role } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    const memberRole = validRoles.includes(role) ? role : 'editor';

    const member = await dbService.addProjectMember(projectId, email.trim().toLowerCase(), memberRole, payload.userId);

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    const msg = error?.message || '';

    if (msg === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'No account found with that email. They need to sign up first.' },
        { status: 404 }
      );
    }
    if (msg === 'ALREADY_MEMBER') {
      return NextResponse.json(
        { error: 'This user is already a member of this project.' },
        { status: 409 }
      );
    }

    console.error('Add project member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — Update member role
export async function PATCH(
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

    if (project.userRole !== 'owner' && project.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can change roles' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin, editor, or viewer.' }, { status: 400 });
    }

    const updated = await dbService.updateProjectMemberRole(projectId, userId, role, payload.userId);

    return NextResponse.json(updated);
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg === 'CANNOT_CHANGE_OWNER_ROLE') {
      return NextResponse.json({ error: 'Cannot change the owner\'s role.' }, { status: 403 });
    }

    console.error('Update member role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Remove a member
export async function DELETE(
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

    if (project.userRole !== 'owner' && project.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const memberUserId = searchParams.get('userId');

    if (!memberUserId) {
      return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
    }

    await dbService.removeProjectMember(projectId, memberUserId, payload.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg === 'CANNOT_REMOVE_OWNER') {
      return NextResponse.json({ error: 'Cannot remove the project owner.' }, { status: 403 });
    }

    console.error('Remove project member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
