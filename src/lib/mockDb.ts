// In-memory Database Mock for Developer Fallback
export interface MockUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  theme: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface MockVerificationToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface MockPasswordResetToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface MockWorkspace {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface MockWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

export interface MockProject {
  id: string;
  name: string;
  description: string | null;
  status: string; // backlog, todo, in_progress, done, archived
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string; // owner, admin, editor, viewer
  createdAt: Date;
}

export interface MockFavoriteProject {
  id: string;
  userId: string;
  projectId: string;
  createdAt: Date;
}

export interface MockTask {
  id: string;
  title: string;
  description: string | null;
  priority: string; // low, medium, high, urgent
  status: string; // backlog, todo, in_progress, done, cancelled
  dueDate: Date | null;
  labels: string; // JSON string of label objects: [{name, color}]
  tags: string; // JSON string of tags: ["bug", "ui"]
  checklist: string; // JSON string of checklist: [{id, title, completed}]
  attachments: string; // JSON string of attachments: [{name, url}]
  timeEstimate: number | null; // in hours
  projectId: string;
  parentTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockComment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: Date;
}

export interface MockTaskDependency {
  id: string;
  blockedTaskId: string;
  blockingTaskId: string;
}

// TRANSPARENCY AUDIT LOG MOCK
export interface MockActivityLog {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  action: string; // create, update, delete, restore, comment
  fieldName: string | null; // e.g. title, description, status, priority, etc.
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

// COLLABORATIVE COMMUNICATION MOCK
export interface MockChatMessage {
  id: string;
  projectId: string;
  userId: string;
  text: string;
  attachments: string; // JSON [{name, url, size}]
  reactions: string; // JSON [{emoji, userIds: []}]
  readBy: string; // JSON ["userId"]
  parentMessageId: string | null;
  createdAt: Date;
}

// FILE COLLABORATION MOCK MODELS
export interface MockFolder {
  id: string;
  name: string;
  projectId: string;
  createdAt: Date;
}

export interface MockProjectFile {
  id: string;
  name: string;
  projectId: string;
  folderId: string | null;
  userId: string;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockFileVersion {
  id: string;
  fileId: string;
  version: number;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface MockFileDownload {
  id: string;
  fileId: string;
  userId: string;
  version: number;
  createdAt: Date;
}

class MockDatabase {
  users: MockUser[] = [];
  sessions: MockSession[] = [];
  verificationTokens: MockVerificationToken[] = [];
  passwordResetTokens: MockPasswordResetToken[] = [];
  workspaces: MockWorkspace[] = [];
  workspaceMembers: MockWorkspaceMember[] = [];
  projects: MockProject[] = [];
  projectMembers: MockProjectMember[] = [];
  favoriteProjects: MockFavoriteProject[] = [];
  tasks: MockTask[] = [];
  comments: MockComment[] = [];
  dependencies: MockTaskDependency[] = [];
  activityLogs: MockActivityLog[] = [];
  chatMessages: MockChatMessage[] = [];
  
  // File Collaboration lists
  folders: MockFolder[] = [];
  files: MockProjectFile[] = [];
  fileVersions: MockFileVersion[] = [];
  fileDownloads: MockFileDownload[] = [];

  constructor() {
    // Seed default workspaces
    const defaultWorkspaceId = 'mock-workspace-1';
    this.workspaces.push({
      id: defaultWorkspaceId,
      name: 'Acme Corp',
      slug: 'acme-corp',
      createdAt: new Date(),
    });
    this.workspaces.push({
      id: 'mock-workspace-2',
      name: 'Personal Space',
      slug: 'personal-space',
      createdAt: new Date(),
    });

    // Seed default projects (in Acme Corp workspace)
    const p1Id = 'mock-project-1';
    const p2Id = 'mock-project-2';
    const p3Id = 'mock-project-3';

    this.projects.push({
      id: p1Id,
      name: 'AI Coprocessor Launch',
      description: 'Deploying neural network pipeline and conversational agents to coordinate platform task queues.',
      status: 'in_progress',
      workspaceId: defaultWorkspaceId,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      updatedAt: new Date(),
    });

    this.projects.push({
      id: p2Id,
      name: 'Security Audit & Compliance',
      description: 'Full-stack vulnerability assessment, JWT secret configurations, and edge middleware verification.',
      status: 'todo',
      workspaceId: defaultWorkspaceId,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    this.projects.push({
      id: p3Id,
      name: 'Q3 Marketing Landing Page',
      description: 'Landing page visual enhancements, glassmorphic layout updates, and interactive mock showcases.',
      status: 'done',
      workspaceId: defaultWorkspaceId,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    });

    // Seed Tasks for AI Coprocessor Launch (p1Id)
    this.tasks.push({
      id: 't1',
      title: 'Verify Edge Middleware Proxy routing controls',
      description: 'Test edge router callbacks on token expiration and check mock user login bypass redirections.',
      priority: 'high',
      status: 'done',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      labels: JSON.stringify([{ name: 'Security', color: '#ef4444' }, { name: 'Edge', color: '#10b981' }]),
      tags: JSON.stringify(['auth', 'infrastructure']),
      checklist: JSON.stringify([
        { id: 'c1', title: 'Write tests for expired JWT handling', completed: true },
        { id: 'c2', title: 'Confirm SameSite cookie path alignment', completed: true }
      ]),
      attachments: JSON.stringify([{ name: 'middleware-spec.pdf', url: '#' }]),
      timeEstimate: 8,
      projectId: p1Id,
      parentTaskId: null,
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });

    this.tasks.push({
      id: 't2',
      title: 'Seed mock databases with rich demo records',
      description: 'Generate starter sets representing real-world projects, priority flags, and dynamic progress metrics.',
      priority: 'medium',
      status: 'done',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      labels: JSON.stringify([{ name: 'Database', color: '#3b82f6' }]),
      tags: JSON.stringify(['dev-env']),
      checklist: JSON.stringify([]),
      attachments: JSON.stringify([]),
      timeEstimate: 4,
      projectId: p1Id,
      parentTaskId: null,
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });

    this.tasks.push({
      id: 't3',
      title: 'Deploy prediction APIs and WebSocket connections',
      description: 'Setup streaming event queues to dispatch task updates in real-time between clients.',
      priority: 'urgent',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // due in 3 days
      labels: JSON.stringify([{ name: 'Core API', color: '#818cf8' }]),
      tags: JSON.stringify(['backend', 'real-time']),
      checklist: JSON.stringify([
        { id: 'c3', title: 'Design message dispatch schemas', completed: true },
        { id: 'c4', title: 'Setup connection reconnection fallback limits', completed: false }
      ]),
      attachments: JSON.stringify([]),
      timeEstimate: 16,
      projectId: p1Id,
      parentTaskId: null,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });

    this.tasks.push({
      id: 't4',
      title: 'Design conversational UI layout and floating cards',
      description: 'Implement conversational sidebar panel drawing suggestions from the active workspace context.',
      priority: 'low',
      status: 'todo',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // due in 10 days
      labels: JSON.stringify([{ name: 'UI/UX', color: '#ec4899' }]),
      tags: JSON.stringify(['frontend', 'design']),
      checklist: JSON.stringify([]),
      attachments: JSON.stringify([]),
      timeEstimate: 12,
      projectId: p1Id,
      parentTaskId: null,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });

    // Seed Subtasks for 't3'
    this.tasks.push({
      id: 't3-sub1',
      title: 'Configure model endpoint weight matrices',
      description: 'Load tensor networks into engine memory blocks.',
      priority: 'medium',
      status: 'todo',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      labels: JSON.stringify([]),
      tags: JSON.stringify([]),
      checklist: JSON.stringify([]),
      attachments: JSON.stringify([]),
      timeEstimate: 6,
      projectId: p1Id,
      parentTaskId: 't3',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.tasks.push({
      id: 't3-sub2',
      title: 'Establish secure WebSocket handshake rules',
      description: 'Setup token verification inside upgraded connection header hooks.',
      priority: 'high',
      status: 'done',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      labels: JSON.stringify([]),
      tags: JSON.stringify([]),
      checklist: JSON.stringify([]),
      attachments: JSON.stringify([]),
      timeEstimate: 4,
      projectId: p1Id,
      parentTaskId: 't3',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Seed task dependencies (t3 is blocked by t2)
    this.dependencies.push({
      id: 'd1',
      blockedTaskId: 't3',
      blockingTaskId: 't2'
    });

    // Seed task comments (for t3)
    this.comments.push({
      id: 'c1',
      taskId: 't3',
      userId: 'mock-user-admin',
      text: 'We must verify that the WebSocket router scales and closes inactive connection pipes safely.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    });
    this.comments.push({
      id: 'c2',
      taskId: 't3',
      userId: 'mock-user-admin',
      text: 'Good point, I added checkmarks in the checklist to track connection closing policies.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    // SEED AUDIT LOGS
    const seedUserId = 'mock-user-admin';
    this.activityLogs.push(
      {
        id: 'log1',
        projectId: p1Id,
        taskId: null,
        userId: seedUserId,
        action: 'create',
        fieldName: 'project',
        oldValue: null,
        newValue: 'AI Coprocessor Launch',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'log2',
        projectId: p1Id,
        taskId: 't3',
        userId: seedUserId,
        action: 'create',
        fieldName: 'task',
        oldValue: null,
        newValue: 'Deploy prediction APIs and WebSocket connections',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'log3',
        projectId: p1Id,
        taskId: 't3',
        userId: seedUserId,
        action: 'update',
        fieldName: 'description',
        oldValue: 'Initial design drafts placeholder description text block',
        newValue: 'Setup streaming event queues to dispatch task updates in real-time between clients.',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'log4',
        projectId: p1Id,
        taskId: 't3',
        userId: seedUserId,
        action: 'update',
        fieldName: 'priority',
        oldValue: 'medium',
        newValue: 'urgent',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'log5',
        projectId: p1Id,
        taskId: 't3',
        userId: seedUserId,
        action: 'comment',
        fieldName: null,
        oldValue: null,
        newValue: 'We must verify that the WebSocket router scales and closes inactive connection pipes safely.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    );

    // SEED CHAT MESSAGES
    const msg1Id = 'msg1';
    const msg2Id = 'msg2';

    this.chatMessages.push(
      {
        id: msg1Id,
        projectId: p1Id,
        userId: seedUserId,
        text: 'Hey team, I deployed the prediction API routes and WebSocket synchronization channels. Let me know if you can see updates in real-time!',
        attachments: '[]',
        reactions: JSON.stringify([{ emoji: '👍', userIds: [seedUserId] }]),
        readBy: JSON.stringify([seedUserId]),
        parentMessageId: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: msg2Id,
        projectId: p1Id,
        userId: seedUserId,
        text: 'Here is the architectural outline diagram for the message queues.',
        attachments: JSON.stringify([{ name: 'arch-outline.png', url: '#', size: 102400 }]),
        reactions: '[]',
        readBy: JSON.stringify([seedUserId]),
        parentMessageId: null,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'reply1',
        projectId: p1Id,
        userId: seedUserId,
        text: "I'll verify connection limits and tab fallbacks on Chrome and Firefox sessions.",
        attachments: '[]',
        reactions: JSON.stringify([{ emoji: '🔥', userIds: [seedUserId] }]),
        readBy: JSON.stringify([seedUserId]),
        parentMessageId: msg1Id,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    );

    // SEED FILES & FOLDERS FOR PROJECT 1
    const fol1Id = 'fol1';
    const fol2Id = 'fol2';

    this.folders.push(
      { id: fol1Id, name: 'Design Specs', projectId: p1Id, createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
      { id: fol2Id, name: 'API Integrations', projectId: p1Id, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
    );

    const file1Id = 'file1';
    const file2Id = 'file2';

    this.files.push(
      {
        id: file1Id,
        name: 'architecture-blueprints.pdf',
        projectId: p1Id,
        folderId: fol1Id,
        userId: seedUserId,
        currentVersion: 2,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: file2Id,
        name: 'dashboard-layout-mockup.png',
        projectId: p1Id,
        folderId: fol1Id,
        userId: seedUserId,
        currentVersion: 1,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    );

    this.fileVersions.push(
      {
        id: 'v1_1',
        fileId: file1Id,
        version: 1,
        url: '#',
        size: 1048576, // 1 MB
        mimeType: 'application/pdf',
        uploadedBy: seedUserId,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'v1_2',
        fileId: file1Id,
        version: 2,
        url: '#',
        size: 1153433, // 1.1 MB
        mimeType: 'application/pdf',
        uploadedBy: seedUserId,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'v2_1',
        fileId: file2Id,
        version: 1,
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
        size: 204800, // 200 KB
        mimeType: 'image/png',
        uploadedBy: seedUserId,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    );

    this.fileDownloads.push({
      id: 'dl1',
      fileId: file1Id,
      userId: seedUserId,
      version: 2,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    });
  }
}

const globalForMockDb = globalThis as unknown as {
  mockDb: MockDatabase | undefined;
};

export const mockDb = globalForMockDb.mockDb ?? new MockDatabase();

if (process.env.NODE_ENV !== 'production') globalForMockDb.mockDb = mockDb;
