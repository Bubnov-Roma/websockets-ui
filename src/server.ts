import { WebSocketServer, WebSocket } from 'ws';
import { httpServer } from './http_server';
import { PlayerService, RoomService, GameService, NotificationService, WinnerService } from './services';
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

const messageHandler = new MessageHandler(
  playerService,
  roomService,
  gameService,
  winnerService,
  notificationService
);

const wss = new WebSocketServer({ port: WS_PORT });

console.log(`WebSocket server is running on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);

      messageHandler.handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
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
    console.log('Client disconnected');
    const player = playerService.getPlayerBySocket(ws);
    if (player) {
      roomService.removePlayerFromRooms(player.index);
      notificationService.updateRooms();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`Start static http server on the http://localhost:${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);