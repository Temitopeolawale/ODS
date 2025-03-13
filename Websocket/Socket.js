import { WebSocketServer } from 'ws';
import { 
    userQuestions, 
    loadPreviousSession, 
    loadAnalysisResults,
    handleObjectDetection,
    sendMessage 
} from '../Controller/AnalyzingController.js';
import url from "url";
import ThreadSchema from "../Models/ThreadModel.js";

export function initializeWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  const connections = new Map();

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    const context = {
      threadId: null,
      activeRun: null,
      conversationHistory: [],
      detections: []
    };

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        console.log('Received message:', data)

        if (data.threadId || data.sessionId) {
          const threadId = data.threadId || data.sessionId;
          context.threadId = threadId;
          connections.set(threadId, { ws, context });
          
          // Check if thread exists and is active
          const thread = await ThreadSchema.findOne({ threadId });
          if (thread && !thread.isActive) {
            console.log(`Client reconnected to inactive thread ${threadId}. Thread will be reactivated when used.`);
          }
        }
        
        // Handle different message types
        switch (data.type) {
          case 'question':
            await userQuestions(ws, data, context);
            break;
          case 'load_session':
            await loadPreviousSession(ws, data);
            break;
          case 'load_analysis':
            await loadAnalysisResults(ws, data);
            break;
          case 'object_detection':
            await handleObjectDetection(ws, data, context);
            break;
          default:
            // Handle legacy message format for backward compatibility
            await userQuestions(ws, data, context);
        }
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