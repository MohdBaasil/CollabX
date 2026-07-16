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

    // Direct mock calculations & db queries
    const mockDb = require('@/lib/mockDb').mockDb;
    const tasks = mockDb.tasks.filter((t: any) => t.projectId === projectId);
    const logs = mockDb.activityLogs.filter((l: any) => l.projectId === projectId);
    const members = mockDb.projectMembers.filter((m: any) => m.projectId === projectId);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
    const todoTasks = tasks.filter((t: any) => t.status === 'todo').length;
    const backlogTasks = tasks.filter((t: any) => t.status === 'backlog').length;
    const cancelledTasks = tasks.filter((t: any) => t.status === 'cancelled').length;

    // Health Score calculation
    const overdueCount = tasks.filter((t: any) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const blockedCount = tasks.filter((t: any) => {
      const deps = mockDb.dependencies.filter((d: any) => d.blockedTaskId === t.id);
      if (deps.length === 0) return false;
      const isBlocked = deps.some((d: any) => {
        const blockingTask = mockDb.tasks.find((x: any) => x.id === d.blockingTaskId);
        return blockingTask && blockingTask.status !== 'done';
      });
      return isBlocked;
    }).length;

    let healthScore = 100 - (overdueCount * 10) - (blockedCount * 15) - (backlogTasks * 2);
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Priorities
    const lowCount = tasks.filter((t: any) => t.priority === 'low').length;
    const medCount = tasks.filter((t: any) => t.priority === 'medium').length;
    const highCount = tasks.filter((t: any) => t.priority === 'high').length;
    const urgentCount = tasks.filter((t: any) => t.priority === 'urgent').length;

    // Team Workload allocation
    const userMap: { [key: string]: number } = {};
    tasks.forEach((t: any) => {
      const uId = t.userId || 'unassigned';
      userMap[uId] = (userMap[uId] || 0) + 1;
    });

    const workloadList = Object.keys(userMap).map(uId => {
      const u = mockDb.users.find((x: any) => x.id === uId) || { name: 'Acme Admin', email: 'admin@acme.org' };
      const count = userMap[uId];
      const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
      return {
        userId: uId,
        userName: u.name || u.email || 'Unassigned',
        taskCount: count,
        percentage: pct
      };
    });

    // Velocity data (Sprint comparisons)
    const velocityData = [
      { sprint: 'Sprint 1', completed: 8, points: 12 },
      { sprint: 'Sprint 2', completed: 14, points: 22 },
      { sprint: 'Sprint 3', completed: 11, points: 18 },
      { sprint: 'Sprint 4', completed: completedTasks || 16, points: (completedTasks * 2) || 26 }
    ];

    // Burndown data (Sprint progress over 10 days)
    const idealBurndown = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    const actualBurndown = [10, 10, 9, 7, 7, 6, 4, 4, 3, 2, totalTasks - completedTasks];

    // Most Active Members (Activity Log analysis)
    const activeMap: { [key: string]: number } = {};
    logs.forEach((l: any) => {
      activeMap[l.userId] = (activeMap[l.userId] || 0) + 1;
    });
    const mostActive = Object.keys(activeMap).map(uId => {
      const u = mockDb.users.find((x: any) => x.id === uId) || { name: 'Acme Admin', email: 'admin@acme.org' };
      return {
        userName: u.name || u.email,
        actionsCount: activeMap[uId]
      };
    }).sort((a, b) => b.actionsCount - a.actionsCount);

    // Contributor Attendance check-ins (14 days matrix grid)
    const attendance: any[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const count = logs.filter((l: any) => new Date(l.createdAt).toDateString() === d.toDateString()).length;
      attendance.push({
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        count: Math.min(4, count) // scale value between 0 and 4 for heatmap boxes
      });
    }

    // AI Weekly Insights
    const aiInsights = [
      'Sprint velocity has accelerated by 15% due to resolution of task dependencies.',
      'Refactoring core handshake parameters shortened onboarding timelines.',
      'Backlog items are well prioritized, but the unassigned task ratio remains high.'
    ];

    // AI Risk Analysis
    const aiRisks = [
      overdueCount > 0 ? `⚠️ ${overdueCount} task card(s) are overdue. Re-schedule due dates to avoid timeline slippage.` : '🟢 No overdue deliverables reported.',
      blockedCount > 0 ? `⚠️ Blocked dependency loop: ${blockedCount} items are awaiting uncompleted blockers.` : '🟢 Sprint path is clear of critical blocking elements.',
      urgentCount > 2 ? `⚠️ High density of Urgent priorities (${urgentCount}) could cause resource burnouts.` : '🟢 Task priority allocation looks balanced.'
    ];

    return NextResponse.json({
      projectHealth: healthScore,
      productivity: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        todo: todoTasks,
        backlog: backlogTasks,
        cancelled: cancelledTasks,
        priorities: {
          low: lowCount,
          medium: medCount,
          high: highCount,
          urgent: urgentCount
        }
      },
      teamWorkload: workloadList,
      velocity: velocityData,
      burndown: {
        ideal: idealBurndown,
        actual: actualBurndown
      },
      mostActive,
      attendance,
      aiInsights,
      aiRisks
    });
  } catch (error) {
    console.error('Analytics compute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
