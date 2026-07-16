const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.WS_PORT || 3001;

// Create HTTP server to attach WebSocket to
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('CollabSpace WebSocket Sync Server is Active\n');
});

const wss = new WebSocketServer({ server });

// Map of projectId -> Set of connected client sockets
const projectRooms = new Map();

// Helper to broadcast to a room
function broadcastToRoom(projectId, messageObject, skipClientId = null) {
  const room = projectRooms.get(projectId);
  if (!room) return;

  const data = JSON.stringify(messageObject);
  room.forEach((client) => {
    if (client.ws.readyState === 1 && client.id !== skipClientId) {
      client.ws.send(data);
    }
  });
}

// Helper to generate presence list for a project
function getPresenceList(projectId) {
  const room = projectRooms.get(projectId);
  if (!room) return [];
  
  // Return unique user list in the room
  const list = [];
  const seenIds = new Set();

  room.forEach((client) => {
    if (!seenIds.has(client.user.userId)) {
      seenIds.add(client.user.userId);
      list.push(client.user);
    }
  });
  return list;
}

wss.on('connection', (ws, req) => {
  const clientUrl = new URL(req.url, 'http://localhost');
  const token = clientUrl.searchParams.get('token');
  const projectId = clientUrl.searchParams.get('projectId');

  let user = {
    userId: 'mock-user-admin',
    name: 'Anonymous Admin',
    email: 'admin@collabspace.io',
    avatarUrl: null
  };

  // Decode JWT if available
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadBase64 = parts[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        user = {
          userId: payload.userId || 'mock-user-admin',
          name: payload.name || payload.email?.split('@')[0] || 'Acme User',
          email: payload.email || 'user@collabspace.io',
          avatarUrl: payload.avatarUrl || null
        };
      }
    } catch (e) {
      console.warn('Could not parse token in WS handshake:', e.message);
    }
  }

  const clientId = Math.random().toString(36).substring(2, 9);
  const clientContext = {
    id: clientId,
    ws,
    user,
    projectId
  };

  // If projectId is provided, auto-join room
  if (projectId) {
    if (!projectRooms.has(projectId)) {
      projectRooms.set(projectId, new Set());
    }
    projectRooms.get(projectId).add(clientContext);

    console.log(`👤 User connected: ${user.name} joined project ${projectId}`);

    // Notify other clients about the new presence list (with animations)
    const presenceList = getPresenceList(projectId);
    broadcastToRoom(projectId, {
      type: 'presence',
      onlineUsers: presenceList,
      event: { type: 'join', user }
    });
  }

  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const activeProjId = data.projectId || projectId;

      if (!activeProjId) return;

      switch (data.type) {
        case 'join':
          // Move user to the specified room if needed
          if (clientContext.projectId !== activeProjId) {
            // Leave old room
            if (clientContext.projectId && projectRooms.has(clientContext.projectId)) {
              projectRooms.get(clientContext.projectId).delete(clientContext);
              broadcastToRoom(clientContext.projectId, {
                type: 'presence',
                onlineUsers: getPresenceList(clientContext.projectId),
                event: { type: 'leave', user }
              });
            }
            // Join new room
            clientContext.projectId = activeProjId;
            if (!projectRooms.has(activeProjId)) {
              projectRooms.set(activeProjId, new Set());
            }
            projectRooms.get(activeProjId).add(clientContext);
          }

          broadcastToRoom(activeProjId, {
            type: 'presence',
            onlineUsers: getPresenceList(activeProjId),
            event: { type: 'join', user }
          });
          break;

        case 'typing':
          // Broadcast typing indicator to others in the room
          broadcastToRoom(activeProjId, {
            type: 'typing',
            userId: user.userId,
            name: user.name,
            taskId: data.taskId,
            isTyping: data.isTyping
          }, clientId);
          break;

        case 'editing':
          // Broadcast active field edit indicator to others in the room
          broadcastToRoom(activeProjId, {
            type: 'editing',
            userId: user.userId,
            name: user.name,
            taskId: data.taskId,
            isEditing: data.isEditing
          }, clientId);
          break;

        case 'sync':
          // Broadcast updates triggers (e.g. task status drag, comments count, edits)
          broadcastToRoom(activeProjId, {
            type: 'sync',
            userId: user.userId,
            action: data.action,
            payload: data.payload
          }, clientId);
          break;

        case 'chat-message':
          broadcastToRoom(activeProjId, {
            type: 'chat-message',
            message: data.message
          }, clientId);
          break;

        case 'chat-typing':
          broadcastToRoom(activeProjId, {
            type: 'chat-typing',
            userId: user.userId,
            name: user.name,
            isTyping: data.isTyping
          }, clientId);
          break;

        case 'chat-reaction':
          broadcastToRoom(activeProjId, {
            type: 'chat-reaction',
            messageId: data.messageId,
            reactions: data.reactions
          }, clientId);
          break;

        case 'chat-read':
          broadcastToRoom(activeProjId, {
            type: 'chat-read',
            messageId: data.messageId,
            readBy: data.readBy
          }, clientId);
          break;
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    if (clientContext.projectId && projectRooms.has(clientContext.projectId)) {
      const room = projectRooms.get(clientContext.projectId);
      room.delete(clientContext);
      
      console.log(`👤 User disconnected: ${user.name} left project ${clientContext.projectId}`);

      // Broadcast updated presence list
      broadcastToRoom(clientContext.projectId, {
        type: 'presence',
        onlineUsers: getPresenceList(clientContext.projectId),
        event: { type: 'leave', user }
      });
      
      if (room.size === 0) {
        projectRooms.delete(clientContext.projectId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 CollabSpace Real-Time server running on port ${PORT}`);
});
