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
    const cookieStore = await cookies();
    const token = cookieStore.get('collabspace-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await dbService.getProjectTasks(projectId, payload.userId);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Role check: Viewer cannot modify
    if (project.userRole === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot create tasks' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const task = await dbService.createTask({
      title: body.title,
      description: body.description || null,
      priority: body.priority || 'medium',
      status: body.status || 'todo',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      labels: body.labels || [],
      tags: body.tags || [],
      checklist: body.checklist || [],
      attachments: body.attachments || [],
      timeEstimate: body.timeEstimate !== undefined ? parseInt(body.timeEstimate) : null,
      projectId,
      parentTaskId: body.parentTaskId || null,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Role check: Viewer cannot modify
    if (project.userRole === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot modify tasks' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, ...updateFields } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updated = await dbService.updateTask(taskId, updateFields);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
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

    const project = await dbService.getProjectDetails(projectId, payload.userId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Role check: Viewer cannot modify
    if (project.userRole === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot delete tasks' }, { status: 403 });
    }

    await dbService.deleteTask(taskId);

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
