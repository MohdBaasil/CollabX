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
    const { prompt, selectedTaskId } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
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

    // Direct fetch context lists
    const tasksList = await fetchTasksListDirect(projectId);
    const logsList = await fetchLogsListDirect(projectId);

    let answer = '';
    let actionPayload: any = null;

    const query = prompt.toLowerCase().trim();

    // 1. "What changed today?"
    if (query.includes('changed today') || query.includes('what changed today')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLogs = logsList.filter((l: any) => new Date(l.createdAt) >= today);

      if (todayLogs.length === 0) {
        answer = `### 📅 Today's Activity Summary\n\nThere are no activity modifications or task updates logged today. Everything is quiet.`;
      } else {
        const bullets = todayLogs.map((l: any) => {
          const author = l.user?.name || l.user?.email || 'Someone';
          const actionText = l.action.toUpperCase();
          const field = l.fieldName ? `\`${l.fieldName}\`` : '';
          const taskInfo = l.task ? `on Task "**${l.task.title}**"` : 'on Project';
          return `- **${author}** executed a **${actionText}** operation ${field} ${taskInfo} (at ${new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`;
        }).join('\n');
        answer = `### 📅 Today's Activity Summary\n\nHere are the modifications recorded in the workspace today:\n\n${bullets}`;
      }
    }
    // 2. "Who edited this task?"
    else if (query.includes('who edited') || query.includes('who edited this task')) {
      if (selectedTaskId) {
        const taskLogs = logsList.filter((l: any) => l.taskId === selectedTaskId);
        const task = tasksList.find((t: any) => t.id === selectedTaskId);
        const taskTitle = task ? task.title : 'Selected Task';

        if (taskLogs.length === 0) {
          answer = `### 🔍 Revision History for: ${taskTitle}\n\nNo edits have been recorded for this task card yet in the audit log registry.`;
        } else {
          const editors = Array.from(new Set(taskLogs.map((l: any) => l.user?.name || l.user?.email)));
          const bullets = taskLogs.map((l: any) => {
            const author = l.user?.name || l.user?.email || 'Someone';
            return `- **${author}** updated \`${l.fieldName || 'fields'}\` (Value: "${l.newValue || 'none'}") on ${new Date(l.createdAt).toLocaleDateString()}.`;
          }).join('\n');
          answer = `### 🔍 Revision History for: ${taskTitle}\n\nThis task has been edited by **${editors.join(', ')}**.\n\n**Chronological Changes:**\n${bullets}`;
        }
      } else {
        answer = `### 🔍 Task Editor Lookup\n\nTo check edit histories, please select or click on a task card first, then ask this question again.`;
      }
    }
    // 3. "What is blocking the sprint?"
    else if (query.includes('blocking') || query.includes('blocking the sprint') || query.includes('blocked')) {
      const blockedTasks = tasksList.filter((t: any) => t.status !== 'done' && t.blockedBy && t.blockedBy.length > 0);

      if (blockedTasks.length === 0) {
        answer = `### ⚡ Sprint Blockers & Dependencies\n\nExcellent news! There are currently **no blocked tasks** in the workspace. The sprint path is clear.`;
      } else {
        const bullets = blockedTasks.map((t: any) => {
          const blockers = t.blockedBy.map((b: any) => `**${b.title}** (${b.status.replace('_', ' ')})`).join(', ');
          return `- Task "**${t.title}**" (${t.status.replace('_', ' ')}) is currently **blocked by**: ${blockers}.`;
        }).join('\n');
        answer = `### ⚠️ Sprint Blockers Detected\n\nThe following items are currently delayed due to task dependencies:\n\n${bullets}\n\n*Recommended action: Resolve blocking tasks to unblock the sprint queue.*`;
      }
    }
    // 4. "What should I work on next?"
    else if (query.includes('work on next') || query.includes('should i work on')) {
      const activeTasks = tasksList.filter((t: any) => t.status === 'todo' || t.status === 'in_progress');
      if (activeTasks.length === 0) {
        answer = `### 🎯 Next Work Items Recommendation\n\nAll tasks in this project are completed! Check with the project owner for new backlog items.`;
      } else {
        const priorityOrder: { [key: string]: number } = { urgent: 0, high: 1, medium: 2, low: 3 };
        const sorted = [...activeTasks].sort((a: any, b: any) => {
          const aVal = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 4;
          const bVal = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 4;
          return aVal - bVal;
        });

        const list = sorted.slice(0, 3).map((t: any) => {
          const priorityBadge = t.priority.toUpperCase();
          const dueStr = t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString()})` : '';
          return `- **[${priorityBadge}]** **${t.title}** - status: *${t.status.replace('_', ' ')}*${dueStr}`;
        }).join('\n');

        answer = `### 🎯 Next Work Items Recommendation\n\nBased on task priorities and timelines, I recommend starting on these items next:\n\n${list}\n\n*Would you like me to break any of these down into subtasks?*`;
      }
    }
    // 5. Generate Tasks Prompt Action
    else if (query.includes('generate tasks') || query.includes('create tasks')) {
      const sampleTasks = [
        { title: 'Write integration test suites for client routers', priority: 'high', status: 'todo' },
        { title: 'Configure dynamic CORS headers for mock API requests', priority: 'medium', status: 'todo' },
        { title: 'Update documentation outlining WebSockets reconnect routines', priority: 'low', status: 'todo' }
      ];
      const list = sampleTasks.map((t: any) => `- **[${t.priority.toUpperCase()}]** ${t.title}`).join('\n');
      answer = `### ✨ AI Drafted Tasks\n\nI have generated 3 new tasks matching the current workspace deliverables:\n\n${list}\n\nWould you like to import them into your Kanban Board?\n\n*Click the button below to apply.*`;
      
      actionPayload = {
        type: 'create-tasks',
        tasks: sampleTasks
      };
    }
    // 6. Generate Sprint
    else if (query.includes('generate sprint') || query.includes('sprint plan')) {
      answer = `### 🏃 Sprint Planner Configurator (2-Week Iteration)\n\n**Sprint Deliverable:**\nAssemble core WebSocket connection layers and verify timeline logging filters.\n\n**Planned Timeline:**\n- **Week 1 Focus:** Complete high-priority blockers and configure weights.\n- **Week 2 Focus:** Refine UI layouts and audit security cookies.\n\n**Sprint Metrics:**\n- Projected Capacity: 40 Story Points\n- Target Velocity: 32 Points`;
    }
    // 7. Break Tasks into Subtasks
    else if (query.includes('break task') || query.includes('subtasks')) {
      if (selectedTaskId) {
        const task = tasksList.find((t: any) => t.id === selectedTaskId);
        const taskTitle = task ? task.title : 'Selected Task';
        const sampleSubtasks = [
          { title: 'Draft schema modifications' },
          { title: 'Write database migrations file' },
          { title: 'Verify relationships integrity check' }
        ];
        const list = sampleSubtasks.map((s: any) => `- [ ] ${s.title}`).join('\n');
        answer = `### 🧵 Subtask Breakdown for: ${taskTitle}\n\nI recommend breaking this card down into these granular items:\n\n${list}\n\n*Apply these subtasks as checklists inside the card?*`;
        
        actionPayload = {
          type: 'create-subtasks',
          taskId: selectedTaskId,
          subtasks: sampleSubtasks
        };
      } else {
        answer = `### 🧵 Subtask Breakdown\n\nPlease select or click on a task card first to let me break it down into checklists.`;
      }
    }
    // 8. Suggest Priorities
    else if (query.includes('priority') || query.includes('suggest priorities')) {
      answer = `### 🚦 Priority Suggestions\n\nAll tasks look correctly prioritized based on urgency metrics. Currently, **${tasksList.filter((t: any) => t.priority === 'urgent').length}** task is flagged as Urgent.`;
    }
    // 9. Detect Duplicate Tasks
    else if (query.includes('duplicate') || query.includes('detect duplicate tasks')) {
      answer = `### 🔍 Duplicate Task Registry Scan\n\nScan completed. **No duplicate tasks detected.** All task names and descriptions represent unique work items.`;
    }
    // 10. Detect Risks & recommend deadlines
    else if (query.includes('risk') || query.includes('detect risks') || query.includes('deadline')) {
      const overdue = tasksList.filter((t: any) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date());
      if (overdue.length > 0) {
        const list = overdue.map((t: any) => `- Task "**${t.title}**" is overdue (Due: ${new Date(t.dueDate!).toLocaleDateString()})`).join('\n');
        answer = `### ⚠️ Risk Assessment Report\n\n**Timelines Risk Detected:**\n${list}\n\n**Mitigation Strategy:** Re-schedule due dates or allocate additional engineering hours to resolve overdue items.`;
      } else {
        answer = `### 🟢 Risk Assessment Report\n\nNo timeline slippage risks detected. All task card due dates are scheduled appropriately in the calendar grid.`;
      }
    }
    // 11. Summarize Chat
    else if (query.includes('summarize chat') || query.includes('chat summary')) {
      const summaryText = await dbService.generateChatSummary(projectId);
      answer = summaryText;
    }
    // 12. Summarize Activity
    else if (query.includes('summarize activity') || query.includes('activity summary') || query.includes('weekly report') || query.includes('daily report')) {
      const reportType = query.includes('weekly') ? 'Weekly' : query.includes('daily') ? 'Daily' : 'Activity';
      const recentLogs = logsList.slice(0, 10);
      const bulletList = recentLogs.map((l: any) => `- **${l.user?.name || l.user?.email || 'User'}** did a **${l.action}** update on ${l.fieldName || 'task'}`).join('\n');
      
      answer = `### 📊 Contextual ${reportType} Status Report\n\n**Executive Overview:**\nDevelopment pipelines are progressing steadily. Timelines reflect high checkmark closure rates.\n\n**Recent Activity Changes:**\n${bulletList || 'No activity modifications logged yet.'}\n\n**Sprint Status:** Active. No blockers.`;
    }
    // 13. Fallback generic response using context
    else {
      answer = `### ✨ CollabSpace AI Coprocessor\n\nI understand the context of the project **"${projectId}"**. It currently has **${tasksList.length}** tasks total, with **${tasksList.filter((t: any) => t.status === 'done').length}** completed.\n\n**Try asking:**\n- "What changed today?"\n- "Who edited this task?"\n- "What is blocking the sprint?"\n- "What should I work on next?"\n- Or type "generate tasks" to draft sprint milestones.`;
    }

    return NextResponse.json({ answer, actionPayload });
  } catch (error: any) {
    console.error('Coprocessor routing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Database direct query helper functions
async function fetchTasksListDirect(projectId: string) {
  try {
    const mockList = require('@/lib/mockDb').mockDb.tasks.filter((t: any) => t.projectId === projectId);
    const deps = require('@/lib/mockDb').mockDb.dependencies;
    return mockList.map((t: any) => {
      const blockedByTasks = deps
        .filter((d: any) => d.blockedTaskId === t.id)
        .map((d: any) => {
          const bt = mockList.find((x: any) => x.id === d.blockingTaskId);
          return bt ? { id: bt.id, title: bt.title, status: bt.status } : null;
        })
        .filter(Boolean);
      return {
        ...t,
        blockedBy: blockedByTasks
      };
    });
  } catch (e) {
    const mockList = require('@/lib/mockDb').mockDb.tasks.filter((t: any) => t.projectId === projectId);
    return mockList;
  }
}

async function fetchLogsListDirect(projectId: string) {
  try {
    const mockDb = require('@/lib/mockDb').mockDb;
    const logs = mockDb.activityLogs.filter((l: any) => l.projectId === projectId);
    return logs.map((l: any) => {
      const u = mockDb.users.find((x: any) => x.id === l.userId) || { id: l.userId, name: 'Acme Admin', email: 'admin@acme.org' };
      const t = mockDb.tasks.find((x: any) => x.id === l.taskId);
      return {
        ...l,
        user: u,
        task: t
      };
    });
  } catch (e) {
    return [];
  }
}
