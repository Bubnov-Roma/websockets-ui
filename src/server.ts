import { WebSocketServer, WebSocket } from 'ws';
import { httpServer } from './http_server';
import { PlayerService, RoomService, GameService, NotificationService, WinnerService, BotService } from './services';
import { WSRequest } from './types';
import { MessageHandler } from './handlers';

const HTTP_PORT = 8181;
const WS_PORT = 3000;

const playerService = new PlayerService();
const roomService = new RoomService(playerService);
const gameService = new GameService(playerService);
const winnerService = new WinnerService();
const notificationService = new NotificationService(
  playerService,
  roomService,
  winnerService
);
const botService = new BotService(gameService, notificationService);

const messageHandler = new MessageHandler(
  playerService,
  roomService,
  gameService,
  winnerService,
  notificationService,
  botService
);

const wss = new WebSocketServer({ port: WS_PORT });

console.log(`🚀 WebSocket server is running on ws://localhost:${WS_PORT}`);

let isShuttingDown = false;

const shutdown = () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('\n🛑 Shutting down servers...');

  const forceExitTimer = setTimeout(() => {
    console.log('🛑 Forcing exit...');
    process.exit(1);
  }, 5000);

  const cleanup = () => {
    clearTimeout(forceExitTimer);
  };
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  wss.close(() => {
    console.log('✅ WebSocket server closed');
    cleanup();
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      console.log('👋 Server shutdown complete');
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

wss.on('connection', (ws) => {
  console.log('🎮 New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received:', data);
      messageHandler.handleMessage(ws, data);
    } catch (error) {
      console.error('❌ ', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          data: JSON.stringify({
            error: true,
            errorText: 'Invalid JSON format'
          }),
          id: 0
        }));
      }
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    const player = playerService.getPlayerBySocket(ws);
    if (player) {
      roomService.removePlayerFromRooms(player.index);
      notificationService.updateRooms();
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

console.log(`🌐 HTTP server is running on http://localhost:${HTTP_PORT}`);
httpServer.listen(HTTP_PORT);