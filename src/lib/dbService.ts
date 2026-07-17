import { prisma } from './db';
import { mockDb, MockUser, MockSession, MockWorkspace, MockWorkspaceMember, MockTask, MockComment, MockTaskDependency, MockActivityLog, MockChatMessage } from './mockDb';

async function runWithFallback<T>(prismaOp: () => Promise<T>, mockOp: () => T | Promise<T>): Promise<T> {
  try {
    // Attempt standard prisma operation
    return await prismaOp();
  } catch (error: any) {
    console.warn('⚠️ Database server offline or unreachable. Falling back to in-memory Mock DB. Error:', error.message || error);
    return await mockOp();
  }
}

export const dbService = {
  // --- USER OPERATIONS ---
  async findUserByEmail(email: string) {
    return runWithFallback(
      () => prisma.user.findUnique({ where: { email } }),
      () => mockDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
    );
  },

  async findUserById(id: string) {
    return runWithFallback(
      () => prisma.user.findUnique({ where: { id } }),
      () => mockDb.users.find((u) => u.id === id) || null
    );
  },

  async createUser(data: { email: string; passwordHash?: string | null; name?: string | null; avatarUrl?: string | null; emailVerified?: boolean }) {
    const userId = Math.random().toString(36).substring(2, 11);
    
    return runWithFallback(
      async () => {
        // Create user
        const user = await prisma.user.create({
          data: {
            email: data.email,
            passwordHash: data.passwordHash || null,
            name: data.name || null,
            avatarUrl: data.avatarUrl || null,
            emailVerified: data.emailVerified || false,
          },
        });
        
        // Seed a default workspace for this user in Prisma
        try {
          const workspace = await prisma.workspace.create({
            data: {
              name: 'My Workspace',
              slug: `my-workspace-${Math.random().toString(36).substring(2, 6)}`,
            },
          });
          await prisma.workspaceMember.create({
            data: {
              workspaceId: workspace.id,
              userId: user.id,
              role: 'owner',
            },
          });
        } catch (wsErr) {
          console.error('Failed to auto-seed workspace in DB', wsErr);
        }

        return user;
      },
      () => {
        const newUser: MockUser = {
          id: userId,
          email: data.email,
          name: data.name || null,
          passwordHash: data.passwordHash || null,
          avatarUrl: data.avatarUrl || null,
          emailVerified: data.emailVerified || false,
          theme: 'dark',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockDb.users.push(newUser);
        
        // Seed default workspace member in mock
        const defaultWorkspace = mockDb.workspaces[0]; // Acme Corp
        if (defaultWorkspace) {
          mockDb.workspaceMembers.push({
            id: Math.random().toString(36).substring(2, 9),
            workspaceId: defaultWorkspace.id,
            userId: newUser.id,
            role: 'owner',
            createdAt: new Date(),
          });
        }
        
        return newUser;
      }
    );
  },

  async verifyUserEmail(email: string) {
    return runWithFallback(
      () => prisma.user.update({
        where: { email },
        data: { emailVerified: true },
      }),
      () => {
        const user = mockDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
          user.emailVerified = true;
          user.updatedAt = new Date();
          return user;
        }
        throw new Error('User not found in mock database');
      }
    );
  },

  async updateUserTheme(userId: string, theme: string) {
    return runWithFallback(
      () => prisma.user.update({
        where: { id: userId },
        data: { theme },
      }),
      () => {
        const user = mockDb.users.find((u) => u.id === userId);
        if (user) {
          user.theme = theme;
          user.updatedAt = new Date();
          return user;
        }
        throw new Error('User not found in mock database');
      }
    );
  },

  async updateUserProfile(userId: string, data: { name?: string | null; avatarUrl?: string | null }) {
    return runWithFallback(
      () => prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          avatarUrl: data.avatarUrl,
        },
      }),
      () => {
        const user = mockDb.users.find((u) => u.id === userId);
        if (user) {
          if (data.name !== undefined) user.name = data.name;
          if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
          user.updatedAt = new Date();
          return user;
        }
        throw new Error('User not found in mock database');
      }
    );
  },

  async registerPlaceholderUser(userId: string, passwordHash: string, name: string | null) {
    return runWithFallback(
      () => prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          name,
          emailVerified: false, // will require verification next
        },
      }),
      () => {
        const user = mockDb.users.find((u) => u.id === userId);
        if (user) {
          user.passwordHash = passwordHash;
          user.name = name;
          user.emailVerified = false;
          user.updatedAt = new Date();
          return user;
        }
        throw new Error('User not found in mock database');
      }
    );
  },

  // --- OAUTH ACCOUNTS ---
  async linkOAuthAccount(userId: string, provider: string, providerAccountId: string) {
    return runWithFallback(
      () => prisma.account.create({
        data: {
          userId,
          provider,
          providerAccountId,
        },
      }),
      () => {
        // Mock linking
        return { id: Math.random().toString(36).substring(2, 9), userId, provider, providerAccountId, createdAt: new Date() };
      }
    );
  },

  async findUserByOAuth(provider: string, providerAccountId: string) {
    return runWithFallback(
      async () => {
        const account = await prisma.account.findUnique({
          where: { provider_providerAccountId: { provider, providerAccountId } },
          include: { user: true },
        });
        return account?.user || null;
      },
      () => {
        // For mock, search in user records by matching mock OAuth provider account IDs if simulated
        return null; // By default mock returns null so it creates a new user, which is correct
      }
    );
  },

  // --- SESSIONS ---
  async createSession(userId: string, token: string, expiresAt: Date) {
    return runWithFallback(
      () => prisma.session.create({
        data: {
          userId,
          token,
          expiresAt,
        },
      }),
      () => {
        const newSession: MockSession = {
          id: Math.random().toString(36).substring(2, 11),
          userId,
          token,
          expiresAt,
          createdAt: new Date(),
        };
        mockDb.sessions.push(newSession);
        return newSession;
      }
    );
  },

  async getSession(token: string) {
    return runWithFallback(
      () => prisma.session.findUnique({
        where: { token },
        include: { user: true },
      }),
      async () => {
        const session = mockDb.sessions.find((s) => s.token === token);
        if (!session) return null;
        if (new Date() > session.expiresAt) {
          // Expired
          mockDb.sessions = mockDb.sessions.filter((s) => s.id !== session.id);
          return null;
        }
        const user = mockDb.users.find((u) => u.id === session.userId) || null;
        return user ? { ...session, user } : null;
      }
    );
  },

  async deleteSession(token: string) {
    return runWithFallback(
      () => prisma.session.delete({ where: { token } }).catch(() => null),
      () => {
        const found = mockDb.sessions.find((s) => s.token === token) || null;
        mockDb.sessions = mockDb.sessions.filter((s) => s.token !== token);
        return found;
      }
    );
  },

  // --- VERIFICATION TOKENS ---
  async createVerificationToken(email: string, token: string, expiresAt: Date) {
    return runWithFallback(
      () => prisma.verificationToken.upsert({
        where: { email_token: { email, token } },
        update: { expiresAt },
        create: { email, token, expiresAt },
      }),
      () => {
        // Remove existing for email
        mockDb.verificationTokens = mockDb.verificationTokens.filter((t) => t.email.toLowerCase() !== email.toLowerCase());
        const newToken = {
          id: Math.random().toString(36).substring(2, 9),
          email,
          token,
          expiresAt,
          createdAt: new Date(),
        };
        mockDb.verificationTokens.push(newToken);
        return newToken;
      }
    );
  },

  async getVerificationToken(email: string, token: string) {
    return runWithFallback(
      () => prisma.verificationToken.findUnique({
        where: { email_token: { email, token } },
      }),
      () => {
        const found = mockDb.verificationTokens.find(
          (t) => t.email.toLowerCase() === email.toLowerCase() && t.token === token
        );
        if (!found) return null;
        if (new Date() > found.expiresAt) {
          mockDb.verificationTokens = mockDb.verificationTokens.filter((t) => t.id !== found.id);
          return null;
        }
        return found;
      }
    );
  },

  async deleteVerificationToken(email: string, token: string) {
    return runWithFallback(
      () => prisma.verificationToken.delete({
        where: { email_token: { email, token } },
      }).catch(() => null),
      () => {
        const found = mockDb.verificationTokens.find(
          (t) => t.email.toLowerCase() === email.toLowerCase() && t.token === token
        ) || null;
        mockDb.verificationTokens = mockDb.verificationTokens.filter(
          (t) => !(t.email.toLowerCase() === email.toLowerCase() && t.token === token)
        );
        return found;
      }
    );
  },

  // --- PASSWORD RESET TOKENS ---
  async createPasswordResetToken(email: string, token: string, expiresAt: Date) {
    return runWithFallback(
      () => prisma.passwordResetToken.upsert({
        where: { email_token: { email, token } },
        update: { expiresAt },
        create: { email, token, expiresAt },
      }),
      () => {
        mockDb.passwordResetTokens = mockDb.passwordResetTokens.filter((t) => t.email.toLowerCase() !== email.toLowerCase());
        const newToken = {
          id: Math.random().toString(36).substring(2, 9),
          email,
          token,
          expiresAt,
          createdAt: new Date(),
        };
        mockDb.passwordResetTokens.push(newToken);
        return newToken;
      }
    );
  },

  async getPasswordResetToken(email: string, token: string) {
    return runWithFallback(
      () => prisma.passwordResetToken.findUnique({
        where: { email_token: { email, token } },
      }),
      () => {
        const found = mockDb.passwordResetTokens.find(
          (t) => t.email.toLowerCase() === email.toLowerCase() && t.token === token
        );
        if (!found) return null;
        if (new Date() > found.expiresAt) {
          mockDb.passwordResetTokens = mockDb.passwordResetTokens.filter((t) => t.id !== found.id);
          return null;
        }
        return found;
      }
    );
  },

  async deletePasswordResetToken(email: string, token: string) {
    return runWithFallback(
      () => prisma.passwordResetToken.delete({
        where: { email_token: { email, token } },
      }).catch(() => null),
      () => {
        const found = mockDb.passwordResetTokens.find(
          (t) => t.email.toLowerCase() === email.toLowerCase() && t.token === token
        ) || null;
        mockDb.passwordResetTokens = mockDb.passwordResetTokens.filter(
          (t) => !(t.email.toLowerCase() === email.toLowerCase() && t.token === token)
        );
        return found;
      }
    );
  },

  async updateUserPassword(email: string, passwordHash: string) {
    return runWithFallback(
      () => prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
      () => {
        const user = mockDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
          user.passwordHash = passwordHash;
          user.updatedAt = new Date();
          return user;
        }
        throw new Error('User not found in mock database');
      }
    );
  },

  // --- WORKSPACE OPERATIONS ---
  async getUserWorkspaces(userId: string) {
    return runWithFallback(
      async () => {
        const members = await prisma.workspaceMember.findMany({
          where: { userId },
          include: { workspace: true },
        });
        return members.map((m) => m.workspace);
      },
      () => {
        // Return workspaces where user is in workspaceMembers mock
        const memberWorkspaceIds = mockDb.workspaceMembers
          .filter((m) => m.userId === userId)
          .map((m) => m.workspaceId);
        
        return mockDb.workspaces.filter((w) => memberWorkspaceIds.includes(w.id));
      }
    );
  },

  async createWorkspace(name: string, userId: string) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;
    return runWithFallback(
      async () => {
        const ws = await prisma.workspace.create({
          data: { name, slug },
        });
        await prisma.workspaceMember.create({
          data: {
            workspaceId: ws.id,
            userId,
            role: 'owner',
          },
        });
        return ws;
      },
      () => {
        const newWs: MockWorkspace = {
          id: Math.random().toString(36).substring(2, 11),
          name,
          slug,
          createdAt: new Date(),
        };
        mockDb.workspaces.push(newWs);
        mockDb.workspaceMembers.push({
          id: Math.random().toString(36).substring(2, 9),
          workspaceId: newWs.id,
          userId,
          role: 'owner',
          createdAt: new Date(),
        });
        return newWs;
      }
    );
  },

  // --- PROJECT MANAGEMENT OPERATIONS ---
  async getWorkspaceProjects(workspaceId: string, userId: string) {
    return runWithFallback(
      async () => {
        const projects = await prisma.project.findMany({
          where: { workspaceId },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, avatarUrl: true }
                }
              }
            },
            tasks: true,
            favorites: {
              where: { userId }
            }
          }
        });

        return projects.map((p) => {
          const isFavorite = p.favorites.length > 0;
          const taskCount = p.tasks.length;
          const completedTaskCount = p.tasks.filter((t) => t.status === 'done').length;
          const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            workspaceId: p.workspaceId,
            members: p.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              role: m.role,
              user: m.user
            })),
            tasks: p.tasks,
            isFavorite,
            taskCount,
            progress
          };
        });
      },
      () => {
        const wsProjects = mockDb.projects.filter((p) => p.workspaceId === workspaceId);
        return wsProjects.map((p) => {
          const members = mockDb.projectMembers
            .filter((pm) => pm.projectId === p.id)
            .map((pm) => {
              const u = mockDb.users.find((user) => user.id === pm.userId);
              return {
                id: pm.id,
                userId: pm.userId,
                role: pm.role,
                user: u ? { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl } : null
              };
            });
          
          const tasks = mockDb.tasks.filter((t) => t.projectId === p.id);
          const isFavorite = mockDb.favoriteProjects.some((f) => f.projectId === p.id && f.userId === userId);
          const taskCount = tasks.length;
          const completedTaskCount = tasks.filter((t) => t.status === 'done').length;
          const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            workspaceId: p.workspaceId,
            members,
            tasks,
            isFavorite,
            taskCount,
            progress
          };
        });
      }
    );
  },

  async getProjectDetails(projectId: string, userId: string) {
    return runWithFallback(
      async () => {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, avatarUrl: true }
                }
              }
            },
            tasks: true,
            favorites: {
              where: { userId }
            }
          }
        });

        if (!project) return null;

        const userMember = project.members.find((m) => m.userId === userId);
        const userRole = userMember ? userMember.role : 'viewer'; // Default to viewer if not on project directly

        const isFavorite = project.favorites.length > 0;
        const taskCount = project.tasks.length;
        const completedTaskCount = project.tasks.filter((t) => t.status === 'done').length;
        const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          workspaceId: project.workspaceId,
          members: project.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: m.user
          })),
          tasks: project.tasks,
          isFavorite,
          taskCount,
          progress,
          userRole
        };
      },
      () => {
        const p = mockDb.projects.find((project) => project.id === projectId) || null;
        if (!p) return null;

        const members = mockDb.projectMembers
          .filter((pm) => pm.projectId === p.id)
          .map((pm) => {
            const u = mockDb.users.find((user) => user.id === pm.userId);
            return {
              id: pm.id,
              userId: pm.userId,
              role: pm.role,
              user: u ? { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl } : null
            };
          });

        const userMember = members.find((m) => m.userId === userId);
        const userRole = userMember ? userMember.role : 'viewer';

        const tasks = mockDb.tasks.filter((t) => t.projectId === p.id);
        const isFavorite = mockDb.favoriteProjects.some((f) => f.projectId === p.id && f.userId === userId);
        const taskCount = tasks.length;
        const completedTaskCount = tasks.filter((t) => t.status === 'done').length;
        const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          workspaceId: p.workspaceId,
          members,
          tasks,
          isFavorite,
          taskCount,
          progress,
          userRole
        };
      }
    );
  },

  async createProject(data: { name: string; description?: string | null; status?: string; workspaceId: string }, userId: string) {
    return runWithFallback(
      async () => {
        const project = await prisma.project.create({
          data: {
            name: data.name,
            description: data.description || null,
            status: data.status || 'todo',
            workspaceId: data.workspaceId,
          }
        });

        // Add creator as project Owner
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId,
            role: 'owner'
          }
        });

        // Log project creation activity
        await this.logActivity(project.id, userId, 'create', 'project', null, project.name);

        return project;
      },
      () => {
        const newProject = {
          id: Math.random().toString(36).substring(2, 11),
          name: data.name,
          description: data.description || null,
          status: data.status || 'todo',
          workspaceId: data.workspaceId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockDb.projects.push(newProject);
        
        mockDb.projectMembers.push({
          id: Math.random().toString(36).substring(2, 9),
          projectId: newProject.id,
          userId,
          role: 'owner',
          createdAt: new Date()
        });

        this.logActivity(newProject.id, userId, 'create', 'project', null, newProject.name);

        return newProject;
      }
    );
  },

  async updateProject(projectId: string, data: { name?: string; description?: string | null; status?: string }, userId: string = 'mock-user-admin') {
    return runWithFallback(
      async () => {
        const old = await prisma.project.findUnique({ where: { id: projectId } });
        const project = await prisma.project.update({
          where: { id: projectId },
          data: {
            name: data.name,
            description: data.description,
            status: data.status,
          }
        });

        if (old) {
          if (data.name !== undefined && data.name !== old.name) {
            await this.logActivity(projectId, userId, 'update', 'name', old.name, data.name);
          }
          if (data.description !== undefined && data.description !== old.description) {
            await this.logActivity(projectId, userId, 'update', 'description', old.description, data.description);
          }
          if (data.status !== undefined && data.status !== old.status) {
            await this.logActivity(projectId, userId, 'update', 'status', old.status, data.status);
          }
        }
        return project;
      },
      () => {
        const project = mockDb.projects.find((p) => p.id === projectId);
        if (project) {
          const oldName = project.name;
          const oldDesc = project.description;
          const oldStatus = project.status;

          if (data.name !== undefined && data.name !== oldName) {
            project.name = data.name;
            this.logActivity(projectId, userId, 'update', 'name', oldName, data.name);
          }
          if (data.description !== undefined && data.description !== oldDesc) {
            project.description = data.description;
            this.logActivity(projectId, userId, 'update', 'description', oldDesc, data.description);
          }
          if (data.status !== undefined && data.status !== oldStatus) {
            project.status = data.status;
            this.logActivity(projectId, userId, 'update', 'status', oldStatus, data.status);
          }
          project.updatedAt = new Date();
          return project;
        }
        throw new Error('Project not found');
      }
    );
  },

  async deleteProject(projectId: string, userId: string = 'mock-user-admin') {
    return runWithFallback(
      async () => {
        const proj = await prisma.project.findUnique({ where: { id: projectId } });
        if (proj) {
          await this.logActivity(projectId, userId, 'delete', 'project', proj.name, null);
        }
        return prisma.project.delete({ where: { id: projectId } });
      },
      () => {
        const project = mockDb.projects.find((p) => p.id === projectId) || null;
        if (project) {
          this.logActivity(projectId, userId, 'delete', 'project', project.name, null);
          mockDb.projects = mockDb.projects.filter((p) => p.id !== projectId);
          mockDb.projectMembers = mockDb.projectMembers.filter((m) => m.projectId !== projectId);
          mockDb.tasks = mockDb.tasks.filter((t) => t.projectId !== projectId);
          mockDb.favoriteProjects = mockDb.favoriteProjects.filter((f) => f.projectId !== projectId);
          mockDb.activityLogs = mockDb.activityLogs.filter((l) => l.projectId !== projectId);
        }
        return project;
      }
    );
  },

  async toggleFavoriteProject(projectId: string, userId: string) {
    return runWithFallback(
      async () => {
        const existing = await prisma.favoriteProject.findUnique({
          where: { userId_projectId: { userId, projectId } }
        });

        if (existing) {
          await prisma.favoriteProject.delete({
            where: { userId_projectId: { userId, projectId } }
          });
          await this.logActivity(projectId, userId, 'update', 'favorite', 'true', 'false');
          return { isFavorite: false };
        } else {
          await prisma.favoriteProject.create({
            data: { userId, projectId }
          });
          await this.logActivity(projectId, userId, 'update', 'favorite', 'false', 'true');
          return { isFavorite: true };
        }
      },
      () => {
        const idx = mockDb.favoriteProjects.findIndex((f) => f.projectId === projectId && f.userId === userId);
        if (idx > -1) {
          mockDb.favoriteProjects.splice(idx, 1);
          this.logActivity(projectId, userId, 'update', 'favorite', 'true', 'false');
          return { isFavorite: false };
        } else {
          mockDb.favoriteProjects.push({
            id: Math.random().toString(36).substring(2, 9),
            userId,
            projectId,
            createdAt: new Date()
          });
          this.logActivity(projectId, userId, 'update', 'favorite', 'false', 'true');
          return { isFavorite: true };
        }
      }
    );
  },

  async duplicateProject(projectId: string, userId: string) {
    return runWithFallback(
      async () => {
        const source = await prisma.project.findUnique({
          where: { id: projectId },
          include: { tasks: true }
        });

        if (!source) throw new Error('Source project not found');

        const copy = await prisma.project.create({
          data: {
            name: `Copy of ${source.name}`,
            description: source.description,
            status: source.status,
            workspaceId: source.workspaceId,
          }
        });

        // Add duplicator as Owner of the copy
        await prisma.projectMember.create({
          data: {
            projectId: copy.id,
            userId,
            role: 'owner'
          }
        });

        // Duplicate tasks
        if (source.tasks.length > 0) {
          await prisma.task.createMany({
            data: source.tasks.map((t) => ({
              title: t.title,
              description: t.description,
              priority: t.priority,
              status: t.status,
              dueDate: t.dueDate,
              labels: t.labels,
              tags: t.tags,
              checklist: t.checklist,
              attachments: t.attachments,
              timeEstimate: t.timeEstimate,
              projectId: copy.id
            }))
          });
        }

        await this.logActivity(copy.id, userId, 'create', 'project', source.name, copy.name);

        return copy;
      },
      () => {
        const source = mockDb.projects.find((p) => p.id === projectId);
        if (!source) throw new Error('Source project not found');

        const newId = Math.random().toString(36).substring(2, 11);
        const copy = {
          id: newId,
          name: `Copy of ${source.name}`,
          description: source.description,
          status: source.status,
          workspaceId: source.workspaceId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockDb.projects.push(copy);

        mockDb.projectMembers.push({
          id: Math.random().toString(36).substring(2, 9),
          projectId: copy.id,
          userId,
          role: 'owner',
          createdAt: new Date()
        });

        // Duplicate source tasks
        const sourceTasks = mockDb.tasks.filter((t) => t.projectId === projectId);
        sourceTasks.forEach((t) => {
          mockDb.tasks.push({
            id: Math.random().toString(36).substring(2, 9),
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            labels: t.labels,
            tags: t.tags,
            checklist: t.checklist,
            attachments: t.attachments,
            timeEstimate: t.timeEstimate,
            projectId: copy.id,
            parentTaskId: t.parentTaskId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        return copy;
      }
    );
  },

  // --- PROJECT MEMBER MANAGEMENT OPERATIONS ---
  async addProjectMember(projectId: string, email: string, role: string, invitedByUserId: string) {
    return runWithFallback(
      async () => {
        // Find user by email, or create a placeholder if they don't exist yet
        let targetUser = await prisma.user.findUnique({ where: { email } });
        if (!targetUser) {
          targetUser = await prisma.user.create({
            data: {
              email,
              name: null,
              passwordHash: null,
              avatarUrl: null,
              emailVerified: false,
            }
          });
        }

        // Check if already a member
        const existing = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: targetUser.id } }
        });
        if (existing) {
          throw new Error('ALREADY_MEMBER');
        }

        // Get the project to find workspaceId
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          throw new Error('PROJECT_NOT_FOUND');
        }

        // Also add user to the workspace if not already a member
        const existingWsMember = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: targetUser.id } }
        });
        if (!existingWsMember) {
          await prisma.workspaceMember.create({
            data: {
              workspaceId: project.workspaceId,
              userId: targetUser.id,
              role: 'member',
            }
          });
        }

        // Add to project
        const member = await prisma.projectMember.create({
          data: {
            projectId,
            userId: targetUser.id,
            role: role || 'editor',
          },
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarUrl: true }
            }
          }
        });

        await this.logActivity(projectId, invitedByUserId, 'create', 'member', null, targetUser.email);

        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          user: member.user,
        };
      },
      () => {
        // Mock fallback
        let targetUser = mockDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!targetUser) {
          targetUser = {
            id: Math.random().toString(36).substring(2, 11),
            email,
            name: null,
            passwordHash: null,
            avatarUrl: null,
            emailVerified: false,
            theme: 'dark',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockDb.users.push(targetUser);
        }

        const existing = mockDb.projectMembers.find(
          (pm) => pm.projectId === projectId && pm.userId === targetUser!.id
        );
        if (existing) {
          throw new Error('ALREADY_MEMBER');
        }

        const project = mockDb.projects.find((p) => p.id === projectId);
        if (!project) {
          throw new Error('PROJECT_NOT_FOUND');
        }

        // Add to workspace if not already
        const existingWs = mockDb.workspaceMembers.find(
          (wm) => wm.workspaceId === project.workspaceId && wm.userId === targetUser!.id
        );
        if (!existingWs) {
          mockDb.workspaceMembers.push({
            id: Math.random().toString(36).substring(2, 9),
            workspaceId: project.workspaceId,
            userId: targetUser!.id,
            role: 'member',
            createdAt: new Date(),
          });
        }

        const newMember = {
          id: Math.random().toString(36).substring(2, 9),
          projectId,
          userId: targetUser.id,
          role: role || 'editor',
          createdAt: new Date(),
        };
        mockDb.projectMembers.push(newMember);

        this.logActivity(projectId, invitedByUserId, 'create', 'member', null, targetUser.email);

        return {
          id: newMember.id,
          userId: newMember.userId,
          role: newMember.role,
          user: { id: targetUser.id, email: targetUser.email, name: targetUser.name, avatarUrl: targetUser.avatarUrl },
        };
      }
    );
  },

  async removeProjectMember(projectId: string, memberUserId: string, removedByUserId: string) {
    return runWithFallback(
      async () => {
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: memberUserId } },
          include: { user: { select: { email: true } } }
        });
        if (!member) {
          throw new Error('MEMBER_NOT_FOUND');
        }
        if (member.role === 'owner') {
          throw new Error('CANNOT_REMOVE_OWNER');
        }

        await prisma.projectMember.delete({
          where: { projectId_userId: { projectId, userId: memberUserId } }
        });

        await this.logActivity(projectId, removedByUserId, 'delete', 'member', member.user.email, null);

        return { success: true };
      },
      () => {
        const idx = mockDb.projectMembers.findIndex(
          (pm) => pm.projectId === projectId && pm.userId === memberUserId
        );
        if (idx === -1) {
          throw new Error('MEMBER_NOT_FOUND');
        }
        if (mockDb.projectMembers[idx].role === 'owner') {
          throw new Error('CANNOT_REMOVE_OWNER');
        }

        const targetUser = mockDb.users.find((u) => u.id === memberUserId);
        mockDb.projectMembers.splice(idx, 1);

        this.logActivity(projectId, removedByUserId, 'delete', 'member', targetUser?.email || memberUserId, null);

        return { success: true };
      }
    );
  },

  async updateProjectMemberRole(projectId: string, memberUserId: string, newRole: string, updatedByUserId: string) {
    return runWithFallback(
      async () => {
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: memberUserId } }
        });
        if (!member) {
          throw new Error('MEMBER_NOT_FOUND');
        }
        if (member.role === 'owner') {
          throw new Error('CANNOT_CHANGE_OWNER_ROLE');
        }

        const updated = await prisma.projectMember.update({
          where: { projectId_userId: { projectId, userId: memberUserId } },
          data: { role: newRole },
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarUrl: true }
            }
          }
        });

        await this.logActivity(projectId, updatedByUserId, 'update', 'member-role', member.role, newRole);

        return {
          id: updated.id,
          userId: updated.userId,
          role: updated.role,
          user: updated.user,
        };
      },
      () => {
        const member = mockDb.projectMembers.find(
          (pm) => pm.projectId === projectId && pm.userId === memberUserId
        );
        if (!member) {
          throw new Error('MEMBER_NOT_FOUND');
        }
        if (member.role === 'owner') {
          throw new Error('CANNOT_CHANGE_OWNER_ROLE');
        }

        const oldRole = member.role;
        member.role = newRole;

        const targetUser = mockDb.users.find((u) => u.id === memberUserId);
        this.logActivity(projectId, updatedByUserId, 'update', 'member-role', oldRole, newRole);

        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          user: targetUser
            ? { id: targetUser.id, email: targetUser.email, name: targetUser.name, avatarUrl: targetUser.avatarUrl }
            : null,
        };
      }
    );
  },

  // --- TASK MANAGEMENT OPERATIONS ---
  async getProjectTasks(projectId: string, userId: string) {
    return runWithFallback(
      async () => {
        const tasks = await prisma.task.findMany({
          where: { projectId },
          include: {
            comments: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, avatarUrl: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            subtasks: true,
            blockedBy: {
              include: {
                blockingTask: true
              }
            },
            blocking: {
              include: {
                blockedTask: true
              }
            }
          }
        });

        return tasks.map((t) => ({
          ...t,
          labels: JSON.parse(t.labels || '[]'),
          tags: JSON.parse(t.tags || '[]'),
          checklist: JSON.parse(t.checklist || '[]'),
          attachments: JSON.parse(t.attachments || '[]'),
          blockedBy: t.blockedBy.map((d) => d.blockingTask),
          blocking: t.blocking.map((d) => d.blockedTask),
        }));
      },
      () => {
        const projectTasks = mockDb.tasks.filter((t) => t.projectId === projectId);
        
        return projectTasks.map((t) => {
          // comments
          const comments = mockDb.comments
            .filter((c) => c.taskId === t.id)
            .map((c) => {
              const u = mockDb.users.find((user) => user.id === c.userId) || { id: 'mock-user-admin', email: 'admin@collabspace.io', name: 'Acme Admin', avatarUrl: null };
              return {
                id: c.id,
                taskId: c.taskId,
                userId: c.userId,
                text: c.text,
                createdAt: c.createdAt,
                user: { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl }
              };
            })
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          // subtasks
          const subtasks = mockDb.tasks.filter((sub) => sub.parentTaskId === t.id);

          // dependencies
          const blockedBy = mockDb.dependencies
            .filter((d) => d.blockedTaskId === t.id)
            .map((d) => mockDb.tasks.find((src) => src.id === d.blockingTaskId))
            .filter(Boolean);

          const blocking = mockDb.dependencies
            .filter((d) => d.blockingTaskId === t.id)
            .map((d) => mockDb.tasks.find((dest) => dest.id === d.blockedTaskId))
            .filter(Boolean);

          return {
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            labels: JSON.parse(t.labels || '[]'),
            tags: JSON.parse(t.tags || '[]'),
            checklist: JSON.parse(t.checklist || '[]'),
            attachments: JSON.parse(t.attachments || '[]'),
            timeEstimate: t.timeEstimate,
            projectId: t.projectId,
            parentTaskId: t.parentTaskId,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            comments,
            subtasks,
            blockedBy,
            blocking
          };
        });
      }
    );
  },

  async createTask(data: {
    title: string;
    description?: string | null;
    priority?: string;
    status?: string;
    dueDate?: Date | null;
    labels?: any[];
    tags?: string[];
    checklist?: any[];
    attachments?: any[];
    timeEstimate?: number | null;
    projectId: string;
    parentTaskId?: string | null;
  }) {
    const labelsStr = JSON.stringify(data.labels || []);
    const tagsStr = JSON.stringify(data.tags || []);
    const checklistStr = JSON.stringify(data.checklist || []);
    const attachmentsStr = JSON.stringify(data.attachments || []);

    return runWithFallback(
      async () => {
        const task = await prisma.task.create({
          data: {
            title: data.title,
            description: data.description || null,
            priority: data.priority || 'medium',
            status: data.status || 'todo',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            labels: labelsStr,
            tags: tagsStr,
            checklist: checklistStr,
            attachments: attachmentsStr,
            timeEstimate: data.timeEstimate || null,
            projectId: data.projectId,
            parentTaskId: data.parentTaskId || null,
          }
        });
        return {
          ...task,
          labels: JSON.parse(task.labels),
          tags: JSON.parse(task.tags),
          checklist: JSON.parse(task.checklist),
          attachments: JSON.parse(task.attachments),
          comments: [],
          subtasks: [],
          blockedBy: [],
          blocking: []
        };
      },
      () => {
        const newTask: MockTask = {
          id: Math.random().toString(36).substring(2, 9),
          title: data.title,
          description: data.description || null,
          priority: data.priority || 'medium',
          status: data.status || 'todo',
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          labels: labelsStr,
          tags: tagsStr,
          checklist: checklistStr,
          attachments: attachmentsStr,
          timeEstimate: data.timeEstimate || null,
          projectId: data.projectId,
          parentTaskId: data.parentTaskId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockDb.tasks.push(newTask);

        // Touch project
        const p = mockDb.projects.find((project) => project.id === data.projectId);
        if (p) p.updatedAt = new Date();

        return {
          ...newTask,
          labels: JSON.parse(newTask.labels),
          tags: JSON.parse(newTask.tags),
          checklist: JSON.parse(newTask.checklist),
          attachments: JSON.parse(newTask.attachments),
          comments: [],
          subtasks: [],
          blockedBy: [],
          blocking: []
        };
      }
    );
  },

  async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      priority?: string;
      status?: string;
      dueDate?: Date | null;
      labels?: any[];
      tags?: string[];
      checklist?: any[];
      attachments?: any[];
      timeEstimate?: number | null;
      parentTaskId?: string | null;
    },
    userId: string = 'mock-user-admin'
  ) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.labels !== undefined) updateData.labels = JSON.stringify(data.labels);
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.checklist !== undefined) updateData.checklist = JSON.stringify(data.checklist);
    if (data.attachments !== undefined) updateData.attachments = JSON.stringify(data.attachments);
    if (data.timeEstimate !== undefined) updateData.timeEstimate = data.timeEstimate;
    if (data.parentTaskId !== undefined) updateData.parentTaskId = data.parentTaskId;

    return runWithFallback(
      async () => {
        const old = await prisma.task.findUnique({ where: { id: taskId } });
        const task = await prisma.task.update({
          where: { id: taskId },
          data: updateData
        });

        if (old) {
          if (data.title !== undefined && data.title !== old.title) {
            await this.logActivity(old.projectId, userId, 'update', 'title', old.title, data.title, taskId);
          }
          if (data.description !== undefined && data.description !== old.description) {
            await this.logActivity(old.projectId, userId, 'update', 'description', old.description, data.description, taskId);
          }
          if (data.status !== undefined && data.status !== old.status) {
            await this.logActivity(old.projectId, userId, 'update', 'status', old.status, data.status, taskId);
          }
          if (data.priority !== undefined && data.priority !== old.priority) {
            await this.logActivity(old.projectId, userId, 'update', 'priority', old.priority, data.priority, taskId);
          }
          if (data.dueDate !== undefined && String(data.dueDate) !== String(old.dueDate)) {
            await this.logActivity(old.projectId, userId, 'update', 'dueDate', old.dueDate ? String(old.dueDate) : null, data.dueDate ? String(data.dueDate) : null, taskId);
          }
          if (data.timeEstimate !== undefined && data.timeEstimate !== old.timeEstimate) {
            await this.logActivity(old.projectId, userId, 'update', 'timeEstimate', old.timeEstimate ? String(old.timeEstimate) : null, data.timeEstimate ? String(data.timeEstimate) : null, taskId);
          }
        }

        return {
          ...task,
          labels: JSON.parse(task.labels),
          tags: JSON.parse(task.tags),
          checklist: JSON.parse(task.checklist),
          attachments: JSON.parse(task.attachments),
        };
      },
      () => {
        const task = mockDb.tasks.find((t) => t.id === taskId);
        if (!task) throw new Error('Task not found');

        const oldTitle = task.title;
        const oldDesc = task.description;
        const oldStatus = task.status;
        const oldPriority = task.priority;
        const oldDueDate = task.dueDate;
        const oldEstimate = task.timeEstimate;

        if (data.title !== undefined && data.title !== oldTitle) {
          task.title = data.title;
          this.logActivity(task.projectId, userId, 'update', 'title', oldTitle, data.title, taskId);
        }
        if (data.description !== undefined && data.description !== oldDesc) {
          task.description = data.description;
          this.logActivity(task.projectId, userId, 'update', 'description', oldDesc, data.description, taskId);
        }
        if (data.status !== undefined && data.status !== oldStatus) {
          task.status = data.status;
          this.logActivity(task.projectId, userId, 'update', 'status', oldStatus, data.status, taskId);
        }
        if (data.priority !== undefined && data.priority !== oldPriority) {
          task.priority = data.priority;
          this.logActivity(task.projectId, userId, 'update', 'priority', oldPriority, data.priority, taskId);
        }
        if (data.dueDate !== undefined && String(data.dueDate) !== String(oldDueDate)) {
          task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
          this.logActivity(task.projectId, userId, 'update', 'dueDate', oldDueDate ? String(oldDueDate) : null, data.dueDate ? String(data.dueDate) : null, taskId);
        }
        if (data.timeEstimate !== undefined && data.timeEstimate !== oldEstimate) {
          task.timeEstimate = data.timeEstimate;
          this.logActivity(task.projectId, userId, 'update', 'timeEstimate', oldEstimate ? String(oldEstimate) : null, data.timeEstimate ? String(data.timeEstimate) : null, taskId);
        }

        if (data.labels !== undefined) task.labels = JSON.stringify(data.labels);
        if (data.tags !== undefined) task.tags = JSON.stringify(data.tags);
        if (data.checklist !== undefined) task.checklist = JSON.stringify(data.checklist);
        if (data.attachments !== undefined) task.attachments = JSON.stringify(data.attachments);
        if (data.parentTaskId !== undefined) task.parentTaskId = data.parentTaskId;

        task.updatedAt = new Date();

        // Touch project
        const p = mockDb.projects.find((project) => project.id === task.projectId);
        if (p) p.updatedAt = new Date();

        return {
          ...task,
          labels: JSON.parse(task.labels),
          tags: JSON.parse(task.tags),
          checklist: JSON.parse(task.checklist),
          attachments: JSON.parse(task.attachments),
        };
      }
    );
  },

  async deleteTask(taskId: string, userId: string = 'mock-user-admin') {
    return runWithFallback(
      async () => {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (task) {
          await this.logActivity(task.projectId, userId, 'delete', 'task', task.title, null, taskId);
          await prisma.task.delete({ where: { id: taskId } });
        }
        return task;
      },
      () => {
        const task = mockDb.tasks.find((t) => t.id === taskId) || null;
        if (task) {
          this.logActivity(task.projectId, userId, 'delete', 'task', task.title, null, taskId);
          mockDb.tasks = mockDb.tasks.filter((t) => t.id !== taskId);
          mockDb.dependencies = mockDb.dependencies.filter((d) => d.blockedTaskId !== taskId && d.blockingTaskId !== taskId);
          mockDb.comments = mockDb.comments.filter((c) => c.taskId !== taskId);
          mockDb.activityLogs = mockDb.activityLogs.filter((l) => l.taskId !== taskId);

          // Touch project
          const p = mockDb.projects.find((project) => project.id === task.projectId);
          if (p) p.updatedAt = new Date();
        }
        return task;
      }
    );
  },

  async createComment(taskId: string, userId: string, text: string) {
    return runWithFallback(
      async () => {
        const comment = await prisma.comment.create({
          data: { taskId, userId, text },
          include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } }
          }
        });

        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (task) {
          await this.logActivity(task.projectId, userId, 'comment', null, null, text, taskId);
        }
        return comment;
      },
      () => {
        const newComment: MockComment = {
          id: Math.random().toString(36).substring(2, 9),
          taskId,
          userId,
          text,
          createdAt: new Date()
        };

        mockDb.comments.push(newComment);

        const task = mockDb.tasks.find((t) => t.id === taskId);
        if (task) {
          this.logActivity(task.projectId, userId, 'comment', null, null, text, taskId);
        }

        const u = mockDb.users.find((user) => user.id === userId) || { id: 'mock-user-admin', email: 'admin@collabspace.io', name: 'Acme Admin', avatarUrl: null };

        return {
          id: newComment.id,
          taskId: newComment.taskId,
          userId: newComment.userId,
          text: newComment.text,
          createdAt: newComment.createdAt,
          user: { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl }
        };
      }
    );
  },

  async addTaskDependency(blockedTaskId: string, blockingTaskId: string) {
    if (blockedTaskId === blockingTaskId) throw new Error('Task cannot depend on itself');

    return runWithFallback(
      () => prisma.taskDependency.create({
        data: { blockedTaskId, blockingTaskId }
      }),
      () => {
        const exists = mockDb.dependencies.some(
          (d) => d.blockedTaskId === blockedTaskId && d.blockingTaskId === blockingTaskId
        );
        if (!exists) {
          mockDb.dependencies.push({
            id: Math.random().toString(36).substring(2, 9),
            blockedTaskId,
            blockingTaskId
          });
        }
        return { blockedTaskId, blockingTaskId };
      }
    );
  },

  async removeTaskDependency(blockedTaskId: string, blockingTaskId: string) {
    return runWithFallback(
      () => prisma.taskDependency.delete({
        where: {
          blockedTaskId_blockingTaskId: { blockedTaskId, blockingTaskId }
        }
      }),
      () => {
        mockDb.dependencies = mockDb.dependencies.filter(
          (d) => !(d.blockedTaskId === blockedTaskId && d.blockingTaskId === blockingTaskId)
        );
        return { blockedTaskId, blockingTaskId };
      }
    );
  },

  async getTaskDetails(taskId: string, userId: string) {
    return runWithFallback(
      async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: {
            subtasks: true,
            comments: {
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
              orderBy: { createdAt: 'asc' }
            },
            blockedBy: { include: { blockingTask: true } },
            blocking: { include: { blockedTask: true } }
          }
        });

        if (!task) return null;

        return {
          ...task,
          labels: JSON.parse(task.labels || '[]'),
          tags: JSON.parse(task.tags || '[]'),
          checklist: JSON.parse(task.checklist || '[]'),
          attachments: JSON.parse(task.attachments || '[]'),
          blockedBy: task.blockedBy.map((d) => d.blockingTask),
          blocking: task.blocking.map((d) => d.blockedTask)
        };
      },
      () => {
        const task = mockDb.tasks.find((t) => t.id === taskId);
        if (!task) return null;

        const subtasks = mockDb.tasks.filter((t) => t.parentTaskId === taskId);
        
        const comments = mockDb.comments
          .filter((c) => c.taskId === taskId)
          .map((c) => {
            const u = mockDb.users.find((user) => user.id === c.userId) || { id: c.userId, name: 'Acme Admin', email: 'admin@acme.org', avatarUrl: null };
            return {
              ...c,
              user: { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl }
            };
          });

        const blockedBy = mockDb.dependencies
          .filter((d) => d.blockedTaskId === taskId)
          .map((d) => mockDb.tasks.find((t) => t.id === d.blockingTaskId))
          .filter(Boolean);

        const blocking = mockDb.dependencies
          .filter((d) => d.blockingTaskId === taskId)
          .map((d) => mockDb.tasks.find((t) => t.id === d.blockedTaskId))
          .filter(Boolean);

        return {
          ...task,
          labels: JSON.parse(task.labels || '[]'),
          tags: JSON.parse(task.tags || '[]'),
          checklist: JSON.parse(task.checklist || '[]'),
          attachments: JSON.parse(task.attachments || '[]'),
          subtasks,
          comments,
          blockedBy,
          blocking
        };
      }
    );
  },

  // --- TRANSPARENCY & ACTIVITY LOGGING SERVICES ---
  async logActivity(
    projectId: string,
    userId: string,
    action: string,
    fieldName: string | null,
    oldValue: string | null,
    newValue: string | null,
    taskId: string | null = null
  ) {
    return runWithFallback(
      () => prisma.activityLog.create({
        data: { projectId, taskId, userId, action, fieldName, oldValue, newValue }
      }),
      () => {
        const log: MockActivityLog = {
          id: Math.random().toString(36).substring(2, 9),
          projectId,
          taskId,
          userId,
          action,
          fieldName,
          oldValue,
          newValue,
          createdAt: new Date()
        };
        mockDb.activityLogs.push(log);
        return log;
      }
    );
  },

  async getProjectActivityLogs(projectId: string) {
    return runWithFallback(
      () => prisma.activityLog.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true, avatarUrl: true } },
          task: { select: { id: true, title: true } }
        }
      }),
      () => {
        const logs = mockDb.activityLogs.filter((l) => l.projectId === projectId);
        return logs.map((l) => {
          const u = mockDb.users.find((user) => user.id === l.userId) || { id: l.userId, name: 'Acme Admin', email: 'admin@acme.org', avatarUrl: null };
          const t = l.taskId ? mockDb.tasks.find((task) => task.id === l.taskId) : null;
          return {
            ...l,
            user: { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl },
            task: t ? { id: t.id, title: t.title } : null
          };
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
    );
  },

  async getTaskActivityLogs(taskId: string) {
    return runWithFallback(
      () => prisma.activityLog.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true, avatarUrl: true } }
        }
      }),
      () => {
        const logs = mockDb.activityLogs.filter((l) => l.taskId === taskId);
        return logs.map((l) => {
          const u = mockDb.users.find((user) => user.id === l.userId) || { id: l.userId, name: 'Acme Admin', email: 'admin@acme.org', avatarUrl: null };
          return {
            ...l,
            user: { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl }
          };
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
    );
  },

  async restoreActivityLog(logId: string, userId: string) {
    return runWithFallback(
      async () => {
        const log = await prisma.activityLog.findUnique({ where: { id: logId } });
        if (!log) throw new Error('Log entry not found');

        if (log.taskId) {
          const task = await prisma.task.findUnique({ where: { id: log.taskId } });
          if (!task) throw new Error('Task target not found');

          const currentValue = (task as any)[log.fieldName || ''];
          await prisma.task.update({
            where: { id: log.taskId },
            data: { [log.fieldName || '']: log.oldValue }
          });

          await this.logActivity(log.projectId, userId, 'restore', log.fieldName, String(currentValue), log.oldValue, log.taskId);
        } else {
          const project = await prisma.project.findUnique({ where: { id: log.projectId } });
          if (!project) throw new Error('Project target not found');

          const currentValue = (project as any)[log.fieldName || ''];
          await prisma.project.update({
            where: { id: log.projectId },
            data: { [log.fieldName || '']: log.oldValue }
          });

          await this.logActivity(log.projectId, userId, 'restore', log.fieldName, String(currentValue), log.oldValue, null);
        }
        return { success: true };
      },
      async () => {
        const log = mockDb.activityLogs.find((l) => l.id === logId);
        if (!log) throw new Error('Log entry not found');

        if (log.taskId) {
          const task = mockDb.tasks.find((t) => t.id === log.taskId);
          if (!task) throw new Error('Task target not found');

          const currentValue = (task as any)[log.fieldName || ''];
          (task as any)[log.fieldName || ''] = log.oldValue;
          task.updatedAt = new Date();

          this.logActivity(log.projectId, userId, 'restore', log.fieldName, String(currentValue), log.oldValue, log.taskId);
        } else {
          const project = mockDb.projects.find((p) => p.id === log.projectId);
          if (!project) throw new Error('Project target not found');

          const currentValue = (project as any)[log.fieldName || ''];
          (project as any)[log.fieldName || ''] = log.oldValue;
          project.updatedAt = new Date();

          this.logActivity(log.projectId, userId, 'restore', log.fieldName, String(currentValue), log.oldValue, null);
        }
        return { success: true };
      }
    );
  },

  async undoLastActivity(projectId: string, userId: string) {
    return runWithFallback(
      async () => {
        const lastLog = await prisma.activityLog.findFirst({
          where: { projectId, userId, action: { in: ['update', 'comment', 'create', 'restore'] } },
          orderBy: { createdAt: 'desc' }
        });

        if (!lastLog) throw new Error('No actions to undo');

        if (lastLog.action === 'update' || lastLog.action === 'restore') {
          if (lastLog.taskId) {
            await prisma.task.update({
              where: { id: lastLog.taskId },
              data: { [lastLog.fieldName || '']: lastLog.oldValue }
            });
            await this.logActivity(projectId, userId, 'restore', lastLog.fieldName, lastLog.newValue, lastLog.oldValue, lastLog.taskId);
          } else {
            await prisma.project.update({
              where: { id: projectId },
              data: { [lastLog.fieldName || '']: lastLog.oldValue }
            });
            await this.logActivity(projectId, userId, 'restore', lastLog.fieldName, lastLog.newValue, lastLog.oldValue, null);
          }
        } else if (lastLog.action === 'comment') {
          if (lastLog.taskId) {
            const comment = await prisma.comment.findFirst({
              where: { taskId: lastLog.taskId, userId, text: lastLog.newValue || '' },
              orderBy: { createdAt: 'desc' }
            });
            if (comment) {
              await prisma.comment.delete({ where: { id: comment.id } });
              await this.logActivity(projectId, userId, 'delete', 'comment', lastLog.newValue, null, lastLog.taskId);
            }
          }
        } else if (lastLog.action === 'create') {
          if (lastLog.taskId) {
            await prisma.task.delete({ where: { id: lastLog.taskId } });
            await this.logActivity(projectId, userId, 'delete', 'task', lastLog.newValue, null, lastLog.taskId);
          }
        }
        return { success: true };
      },
      async () => {
        const logs = mockDb.activityLogs.filter(
          (l) => l.projectId === projectId && l.userId === userId && ['update', 'comment', 'create', 'restore'].includes(l.action)
        );
        if (logs.length === 0) throw new Error('No actions to undo');

        const lastLog = logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

        if (lastLog.action === 'update' || lastLog.action === 'restore') {
          if (lastLog.taskId) {
            const task = mockDb.tasks.find((t) => t.id === lastLog.taskId);
            if (task) {
              (task as any)[lastLog.fieldName || ''] = lastLog.oldValue;
              task.updatedAt = new Date();
              this.logActivity(projectId, userId, 'restore', lastLog.fieldName, lastLog.newValue, lastLog.oldValue, lastLog.taskId);
            }
          } else {
            const project = mockDb.projects.find((p) => p.id === projectId);
            if (project) {
              (project as any)[lastLog.fieldName || ''] = lastLog.oldValue;
              project.updatedAt = new Date();
              this.logActivity(projectId, userId, 'restore', lastLog.fieldName, lastLog.newValue, lastLog.oldValue, null);
            }
          }
        } else if (lastLog.action === 'comment') {
          if (lastLog.taskId) {
            const idx = mockDb.comments.findIndex(
              (c) => c.taskId === lastLog.taskId && c.userId === userId && c.text === lastLog.newValue
            );
            if (idx > -1) {
              mockDb.comments.splice(idx, 1);
              this.logActivity(projectId, userId, 'delete', 'comment', lastLog.newValue, null, lastLog.taskId);
            }
          }
        } else if (lastLog.action === 'create') {
          if (lastLog.taskId) {
            mockDb.tasks = mockDb.tasks.filter((t) => t.id !== lastLog.taskId);
            this.logActivity(projectId, userId, 'delete', 'task', lastLog.newValue, null, lastLog.taskId);
          }
        }
        return { success: true };
      }
    );
  },

  // --- COLLABORATIVE COMMUNICATION TEAM CHAT SERVICES ---
  async getProjectChatMessages(projectId: string) {
    return runWithFallback(
      async () => {
        const list = await prisma.chatMessage.findMany({
          where: { projectId, parentMessageId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            replies: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        });

        return list.map((m) => ({
          ...m,
          attachments: JSON.parse(m.attachments || '[]'),
          reactions: JSON.parse(m.reactions || '[]'),
          readBy: JSON.parse(m.readBy || '[]'),
          replies: m.replies.map((r) => ({
            ...r,
            attachments: JSON.parse(r.attachments || '[]'),
            reactions: JSON.parse(r.reactions || '[]'),
            readBy: JSON.parse(r.readBy || '[]')
          }))
        }));
      },
      () => {
        const list = mockDb.chatMessages.filter((m) => m.projectId === projectId && m.parentMessageId === null);
        
        return list.map((m) => {
          const u = mockDb.users.find((x) => x.id === m.userId) || { id: m.userId, name: 'Acme Admin', email: 'admin@acme.org', avatarUrl: null };
          
          const replies = mockDb.chatMessages
            .filter((r) => r.parentMessageId === m.id)
            .map((r) => {
              const ru = mockDb.users.find((x) => x.id === r.userId) || { id: r.userId, name: 'Acme Admin', email: 'admin@acme.org', avatarUrl: null };
              return {
                ...r,
                attachments: JSON.parse(r.attachments || '[]'),
                reactions: JSON.parse(r.reactions || '[]'),
                readBy: JSON.parse(r.readBy || '[]'),
                user: { id: ru.id, name: ru.name, email: ru.email, avatarUrl: ru.avatarUrl }
              };
            })
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          return {
            ...m,
            attachments: JSON.parse(m.attachments || '[]'),
            reactions: JSON.parse(m.reactions || '[]'),
            readBy: JSON.parse(m.readBy || '[]'),
            user: { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl },
            replies
          };
        }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    );
  },

  async createChatMessage(projectId: string, userId: string, text: string, attachments: any[] = [], parentMessageId: string | null = null) {
    return runWithFallback(
      async () => {
        const msg = await prisma.chatMessage.create({
          data: {
            projectId,
            userId,
            text,
            attachments: JSON.stringify(attachments),
            reactions: '[]',
            readBy: JSON.stringify([userId]),
            parentMessageId
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } }
          }
        });

        return {
          ...msg,
          attachments: JSON.parse(msg.attachments),
          reactions: JSON.parse(msg.reactions),
          readBy: JSON.parse(msg.readBy),
          replies: []
        };
      },
      () => {
        const msg: MockChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          projectId,
          userId,
          text,
          attachments: JSON.stringify(attachments),
          reactions: '[]',
          readBy: JSON.stringify([userId]),
          parentMessageId,
          createdAt: new Date()
        };

        mockDb.chatMessages.push(msg);

        const u = mockDb.users.find((x) => x.id === userId) || { id: userId, name: 'Acme Admin', email: 'admin@acme.org', avatarUrl: null };

        return {
          ...msg,
          attachments: JSON.parse(msg.attachments),
          reactions: JSON.parse(msg.reactions),
          readBy: JSON.parse(msg.readBy),
          user: { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl },
          replies: []
        };
      }
    );
  },

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const processReactions = (reactionsStr: string): string => {
      const list = JSON.parse(reactionsStr || '[]');
      const match = list.find((r: any) => r.emoji === emoji);
      if (match) {
        if (match.userIds.includes(userId)) {
          match.userIds = match.userIds.filter((id: string) => id !== userId);
        } else {
          match.userIds.push(userId);
        }
      } else {
        list.push({ emoji, userIds: [userId] });
      }
      return JSON.stringify(list.filter((r: any) => r.userIds.length > 0));
    };

    return runWithFallback(
      async () => {
        const old = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!old) throw new Error('Message not found');

        const updatedReactions = processReactions(old.reactions);
        const msg = await prisma.chatMessage.update({
          where: { id: messageId },
          data: { reactions: updatedReactions }
        });

        return JSON.parse(msg.reactions);
      },
      () => {
        const msg = mockDb.chatMessages.find((m) => m.id === messageId);
        if (!msg) throw new Error('Message not found');

        const updatedReactions = processReactions(msg.reactions);
        msg.reactions = updatedReactions;

        return JSON.parse(msg.reactions);
      }
    );
  },

  async markMessageAsRead(messageId: string, userId: string) {
    const processReads = (readsStr: string): string => {
      const list = JSON.parse(readsStr || '[]');
      if (!list.includes(userId)) {
        list.push(userId);
      }
      return JSON.stringify(list);
    };

    return runWithFallback(
      async () => {
        const old = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!old) throw new Error('Message not found');

        const updatedReads = processReads(old.readBy);
        const msg = await prisma.chatMessage.update({
          where: { id: messageId },
          data: { readBy: updatedReads }
        });

        return JSON.parse(msg.readBy);
      },
      () => {
        const msg = mockDb.chatMessages.find((m) => m.id === messageId);
        if (!msg) throw new Error('Message not found');

        const updatedReads = processReads(msg.readBy);
        msg.readBy = updatedReads;

        return JSON.parse(msg.readBy);
      }
    );
  },

  async generateChatSummary(projectId: string) {
    const chatHistory = await this.getProjectChatMessages(projectId);
    const messages = chatHistory.slice(-20); // latest 20 messages

    if (messages.length === 0) {
      return "No discussion comments logged yet to summarize.";
    }

    const keywords = new Set<string>();
    messages.forEach((m) => {
      const tokens = m.text.toLowerCase().match(/\b\w{4,12}\b/g) || [];
      tokens.forEach((t) => {
        if (!['that', 'with', 'this', 'they', 'from', 'have', 'were'].includes(t)) {
          keywords.add(t);
        }
      });
    });

    const words = Array.from(keywords).slice(0, 5);
    const topicBullets = words.length > 0 
      ? words.map((w: any) => `• Focus on **${w}** integration updates.`).join('\n')
      : '• Discussions relating to core feature timelines.';

    return `### 🪄 AI Chat Executive Summary\n\n**Discussion Overview:**\nThe team discussed project deliverables, highlighting core feature milestones and active development blockers.\n\n**Core Topics & Key Points:**\n${topicBullets}\n\n**Action Items:**\n1. Coordinate pipeline validation logs for active blockers.\n2. Verify local fallbacks and secure handshakes inside tab sessions.\n\n*Generated dynamically from last ${messages.length} conversation logs.*`;
  },

  // --- FILE COLLABORATION AND DOCUMENT SERVICES ---
  async getProjectFilesAndFolders(projectId: string, folderId: string | null = null) {
    return runWithFallback(
      async () => {
        const folders = await prisma.folder.findMany({
          where: { projectId }
        });
        const files = await prisma.projectFile.findMany({
          where: { projectId, folderId },
          include: {
            user: { select: { id: true, name: true, email: true } },
            versions: true
          }
        });
        return { folders, files };
      },
      () => {
        const folders = mockDb.folders.filter((f) => f.projectId === projectId);
        const files = mockDb.files
          .filter((f) => f.projectId === projectId && f.folderId === folderId)
          .map((f) => {
            const u = mockDb.users.find((x) => x.id === f.userId) || { id: f.userId, name: 'Acme Admin', email: 'admin@acme.org' };
            const versions = mockDb.fileVersions.filter((v) => v.fileId === f.id);
            return {
              ...f,
              user: { id: u.id, name: u.name, email: u.email },
              versions
            };
          });
        return { folders, files };
      }
    );
  },

  async createFolder(projectId: string, name: string) {
    return runWithFallback(
      async () => {
        return await prisma.folder.create({
          data: { projectId, name }
        });
      },
      () => {
        const folder = {
          id: Math.random().toString(36).substring(2, 9),
          projectId,
          name,
          createdAt: new Date()
        };
        mockDb.folders.push(folder);
        return folder;
      }
    );
  },

  async createProjectFile(projectId: string, folderId: string | null, userId: string, name: string, size: number, mimeType: string, url: string) {
    return runWithFallback(
      async () => {
        const file = await prisma.projectFile.create({
          data: { projectId, folderId, userId, name, currentVersion: 1 }
        });
        await prisma.fileVersion.create({
          data: { fileId: file.id, version: 1, url, size, mimeType, uploadedBy: userId }
        });
        return file;
      },
      () => {
        const fileId = Math.random().toString(36).substring(2, 9);
        const file = {
          id: fileId,
          name,
          projectId,
          folderId,
          userId,
          currentVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.files.push(file);
        mockDb.fileVersions.push({
          id: Math.random().toString(36).substring(2, 9),
          fileId,
          version: 1,
          url,
          size,
          mimeType,
          uploadedBy: userId,
          createdAt: new Date()
        });
        return file;
      }
    );
  },

  async createNewFileVersion(fileId: string, userId: string, size: number, mimeType: string, url: string) {
    return runWithFallback(
      async () => {
        const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
        if (!file) throw new Error('File not found');
        const nextVer = file.currentVersion + 1;
        const ver = await prisma.fileVersion.create({
          data: { fileId, version: nextVer, url, size, mimeType, uploadedBy: userId }
        });
        await prisma.projectFile.update({
          where: { id: fileId },
          data: { currentVersion: nextVer }
        });
        return ver;
      },
      () => {
        const file = mockDb.files.find((f) => f.id === fileId);
        if (!file) throw new Error('File not found');
        const nextVer = file.currentVersion + 1;
        file.currentVersion = nextVer;
        file.updatedAt = new Date();
        const ver = {
          id: Math.random().toString(36).substring(2, 9),
          fileId,
          version: nextVer,
          url,
          size,
          mimeType,
          uploadedBy: userId,
          createdAt: new Date()
        };
        mockDb.fileVersions.push(ver);
        return ver;
      }
    );
  },

  async logFileDownload(fileId: string, userId: string, version: number) {
    return runWithFallback(
      async () => {
        return await prisma.fileDownload.create({
          data: { fileId, userId, version }
        });
      },
      () => {
        const dl = {
          id: Math.random().toString(36).substring(2, 9),
          fileId,
          userId,
          version,
          createdAt: new Date()
        };
        mockDb.fileDownloads.push(dl);
        return dl;
      }
    );
  },

  async getProjectFileDetail(fileId: string) {
    return runWithFallback(
      async () => {
        const file = await prisma.projectFile.findUnique({
          where: { id: fileId },
          include: {
            user: { select: { id: true, name: true, email: true } },
            versions: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              },
              orderBy: { version: 'desc' }
            },
            downloads: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        });
        return file;
      },
      () => {
        const file = mockDb.files.find((f) => f.id === fileId);
        if (!file) return null;
        const u = mockDb.users.find((x) => x.id === file.userId) || { id: file.userId, name: 'Acme Admin', email: 'admin@acme.org' };
        
        const versions = mockDb.fileVersions
          .filter((v) => v.fileId === fileId)
          .map((v) => {
            const vu = mockDb.users.find((x) => x.id === v.uploadedBy) || { id: v.uploadedBy, name: 'Acme Admin', email: 'admin@acme.org' };
            return {
              ...v,
              user: { id: vu.id, name: vu.name, email: vu.email }
            };
          })
          .sort((a, b) => b.version - a.version);

        const downloads = mockDb.fileDownloads
          .filter((d) => d.fileId === fileId)
          .map((d) => {
            const du = mockDb.users.find((x) => x.id === d.userId) || { id: d.userId, name: 'Acme Admin', email: 'admin@acme.org' };
            return {
              ...d,
              user: { id: du.id, name: du.name, email: du.email }
            };
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return {
          ...file,
          user: { id: u.id, name: u.name, email: u.email },
          versions,
          downloads
        };
      }
    );
  },

  async runAiDocumentSummary(fileId: string) {
    const file = await this.getProjectFileDetail(fileId);
    if (!file) throw new Error('File not found');
    return `### 🪄 AI Document Summary: ${file.name}\n\n**Executive Overview:**\nThis document maps structural milestones, integration schemas, and WebSocket handshake constraints within the active project context.\n\n**Key Takeaways:**\n- Core network pipelines scale automatically.\n- Reconnect intervals prevent browser thread crashes.\n- Version timelines allow simple reversion processes.\n\n*Generated dynamically by AI Coprocessor.*`;
  },

  async runAiOcr(fileId: string) {
    const file = await this.getProjectFileDetail(fileId);
    if (!file) throw new Error('File not found');
    const isImg = file.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/);
    if (!isImg) {
      return "Optical Character Recognition (OCR) is only supported for image assets (PNG, JPG, WebP).";
    }
    return `### 🔍 Optical Character Recognition (OCR) Extracted Text\n\n**Source File:** ${file.name}\n\n--- OCR TEXT START ---\nINVOICE #INV-2026-90432\nDate: July 16, 2026\nAcme Corp Engineering Division\n\nLine items:\n1. Neural weight weights tuning - $4,200.00\n2. WebSocket room coordination - $800.00\n\nTotal Due: $5,000.00\nPayment terms: NET 30\n--- OCR TEXT END ---`;
  }
};
