import { INotificationService, IPlayerService, IRoomService, IWinnerService } from '../interfaces/index.js';
import { WSMessage } from '../types/index.js';

export class NotificationService implements INotificationService {
  constructor(
    private playerService: IPlayerService,
    private roomService: IRoomService,
    private winnerService: IWinnerService
  ) {}

  updateRooms(): void {
    const roomsData = this.roomService.getAllRooms();
    const message = {
      type: 'update_room',
      data: JSON.stringify(roomsData),
      id: 0
    };
    
    this.broadcast(message);
  }

  updateWinners(): void {
    const winnersData = this.winnerService.getWinners();
    const message = {
      type: 'update_winners',
      data: JSON.stringify(winnersData),
      id: 0
    };
    
    this.broadcast(message);
  }

  sendToPlayer(playerIndex: number, message: WSMessage): void {
    const player = this.playerService.getPlayerByIndex(playerIndex);
    if (player && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(JSON.stringify(message));
    }
  }

  broadcast(message: WSMessage): void {
    this.playerService.getAllPlayers().forEach(player => {
      if (player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(JSON.stringify(message));
      }
    });
  }
}