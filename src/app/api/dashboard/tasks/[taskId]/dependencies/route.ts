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

    const { blockingTaskId } = await request.json();
    if (!blockingTaskId) {
      return NextResponse.json({ error: 'Blocking Task ID is required' }, { status: 400 });
    }

    const result = await dbService.addTaskDependency(taskId, blockingTaskId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create dependency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const blockingTaskId = searchParams.get('blockingTaskId');

    if (!blockingTaskId) {
      return NextResponse.json({ error: 'Blocking Task ID is required' }, { status: 400 });
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

    const result = await dbService.removeTaskDependency(taskId, blockingTaskId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete dependency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
