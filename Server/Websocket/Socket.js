
import { WebSocketServer } from 'ws'
import { userQuestions } from '../Controller/AnalyzingController.js';

export function initializeWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    const context = {
      threadId: null,
      activeRun: null,
      conversationHistory: []
    };

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        await userQuestions(ws, data, context);
      } catch (error) {
        console.error('Connection error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          content: error.message
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      // Optional: Add cleanup logic here
    });
  });

  return wss;
}

