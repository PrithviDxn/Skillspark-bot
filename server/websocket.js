import { WebSocketServer } from 'ws';
import { verifyToken } from './middleware/auth.js';

// Store active interview sessions
const activeSessions = new Map();

export function initializeWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    try {
      // Extract token from query string
      const url = new URL(req.url, 'ws://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify token and get user info
      const user = await verifyToken(token);
      if (!user) {
        ws.close(1008, 'Invalid token');
        return;
      }

      // Extract interview ID from URL path
      const interviewId = req.url.split('/').pop();
      if (!interviewId) {
        ws.close(1008, 'Interview ID required');
        return;
      }

      // Store WebSocket connection
      if (!activeSessions.has(interviewId)) {
        activeSessions.set(interviewId, new Set());
      }
      activeSessions.get(interviewId).add(ws);

      // Send initial state
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        interviewId,
        userId: user.id,
        role: user.role
      }));

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          handleMessage(interviewId, message, user);
        } catch (err) {
          console.error('Error handling message:', err);
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Invalid message format'
          }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        const session = activeSessions.get(interviewId);
        if (session) {
          session.delete(ws);
          if (session.size === 0) {
            activeSessions.delete(interviewId);
          }
        }
      });

    } catch (err) {
      console.error('WebSocket connection error:', err);
      ws.close(1011, 'Internal server error');
    }
  });
}

function handleMessage(interviewId, message, user) {
  const session = activeSessions.get(interviewId);
  if (!session) return;

  // Only admin can control the interview
  if (user.role !== 'admin' && ['START_INTERVIEW', 'PAUSE_INTERVIEW', 'RESUME_INTERVIEW', 'STOP_INTERVIEW'].includes(message.type)) {
    return;
  }

  // Broadcast message to all participants in the session
  const broadcastMessage = JSON.stringify({
    ...message,
    userId: user.id,
    timestamp: new Date().toISOString()
  });

  session.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(broadcastMessage);
    }
  });
}

// Helper function to send message to specific interview session
export function sendToInterview(interviewId, message) {
  const session = activeSessions.get(interviewId);
  if (!session) return;

  const messageStr = JSON.stringify(message);
  session.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
} 