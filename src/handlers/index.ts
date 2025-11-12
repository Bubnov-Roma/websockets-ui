import { IGameService, IMessageHandler, INotificationService, IPlayerService, IRoomService, IWinnerService } from "../interfaces";
import { AddShipsRequest, AddUserToRoomRequest, AttackRequest, RandomAttackRequest, RegRequest, WSRequest } from "../types";
import { WebSocket } from 'ws';

export class MessageHandler implements IMessageHandler {
  constructor(
    private playerService: IPlayerService,
    private roomService: IRoomService,
    private gameService: IGameService,
    private winnerService: IWinnerService,
    private notificationService: INotificationService
  ) {}

  handleMessage(ws: WebSocket, message: WSRequest): void {
    try {
      switch (message.type) {
        case 'reg':
          this.handleRegistration(ws, message);
          break;
        case 'create_room':
          this.handleCreateRoom(ws);
          break;
        case 'add_user_to_room':
          this.handleAddUserToRoom(ws, message);
          break;
        case 'add_ships':
          this.handleAddShips(ws, message);
          break;
        case 'attack':
          this.handleAttack(ws, message);
          break;
        case 'randomAttack':
          this.handleRandomAttack(ws, message);
        default:
          this.sendError(ws, `Unknown command type: ${message.type}`);
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleRegistration(ws: WebSocket, message: RegRequest): void {
    const {name, password} = message.data;
    try {
      const player = this.playerService.registerPlayer(name, password, ws);
      this.sendResponse(ws, 'reg', {
        name: player.name,
        index: player.index,
        error: false,
        errorText: ''
      });
      this.notificationService.updateRooms();
      this.notificationService.updateWinners();
    } catch (error) {
      this.sendResponse(ws, 'reg', {
        name,
        index: -1,
        error: true,
        errorText: error instanceof Error ? error.message : 'Registration failed'
      }); 
    }
  }

  private handleCreateRoom(ws: WebSocket): void {
    const player = this.playerService.getPlayerBySocket(ws);
    if (!player) {
      this.sendError(ws, 'Player not registered');
      return;
    }
    this.roomService.createRoom(player.index);
    this.notificationService.updateRooms();
  }

  private handleAddUserToRoom(ws: WebSocket, message: AddUserToRoomRequest): void {
    const player = this.playerService.getPlayerBySocket(ws);
    if (!player) {
      this.sendError(ws, 'Player not registered');
      return;
    }
    const {indexRoom} = message.data;
    try {
      this.roomService.addUserToRoom(indexRoom, player.index);
      const room = this.roomService.getRoomById(indexRoom);
      if (room && room.roomUsers.length === 2) {
        const game = this.gameService.createGame(room);
        room.roomUsers.forEach(user => {
          this.notificationService.sendToPlayer(user.index, {
            type: 'create_game',
            data: JSON.stringify({
              idGame: game.idGame,
              idPlayer: user.index
            }),
            id: 0
          });
        });
        this.roomService.removeRoom(indexRoom);
        this.notificationService.updateRooms();
      }
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Failed to join room');
    }
  }

  private handleAddShips(ws: WebSocket, message: AddShipsRequest): void {
    const {gameId, ships, indexPlayer} = message.data;
    try {
      this.gameService.addShips(gameId, indexPlayer, ships);
      const game = this.gameService.getGameById(gameId);
      if (game && this.gameService.isGameReady(gameId)) {
        game.playerIds.forEach(playerId => {
          const playerData = game.players.get(playerId);
          if (playerData) {
            this.notificationService.sendToPlayer(playerId, {
            type: 'start_game',
            data: JSON.stringify({
              ships: playerData.ships,
              currentPlayerIndex: playerId
            }),
            id: 0
          });
          }
        });
        game.playerIds.forEach(playerId => {
          this.notificationService.sendToPlayer(playerId, {
            type: 'turn',
            data: JSON.stringify({
              currentPlayer: game.currentPlayer
            }),
            id: 0
          });
        });
      }
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Failed to add ships');
    }
  }

  private handleAttack(ws: WebSocket, message: AttackRequest): void {
    const {gameId, x, y, indexPlayer} = message.data;
    try {
      const result = this.gameService.attack(gameId, indexPlayer, x, y);
      const game = this.gameService.getGameById(gameId);
      if (game) {
        game.playerIds.forEach(playerId => {
          this.notificationService.sendToPlayer(playerId, {
            type: 'attack',
            data: JSON.stringify({
              position: {x, y},
              currentPlayer: indexPlayer,
              status: result.status
            }),
            id: 0
          });
        });
        if (result.nextPlayer !== undefined) {
          game.playerIds.forEach(playerId => {
            this.notificationService.sendToPlayer(playerId, {
              type: 'turn',
              data: JSON.stringify({
                currentPlayer: result.nextPlayer
              }),
              id: 0
            });
          });
        }

        const opponentId = game.playerIds.find(id => id !== indexPlayer);
        if (opponentId) {
          const opponent = game.players.get(opponentId);
          if (opponent && opponent.ships.every(ship => this.gameService['isShipKilled'](ship, opponent.attacks))) {
            this.winnerService.addWin(`${indexPlayer}`);
            this.notificationService.updateWinners();
            game.playerIds.forEach(playerId => {
              this.notificationService.sendToPlayer(playerId, {
                type: 'finish',
                data: JSON.stringify({
                  winPlayer: indexPlayer
                }),
                id: 0
              });
            });
          }
        } 
      }
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Attack failed');
    }
  }

  private handleRandomAttack(ws: WebSocket, message: RandomAttackRequest): void {
    const {gameId, indexPlayer} = message.data;
    try {
      const {x, y} = this.gameService.randomAttack(gameId, indexPlayer);
      const attackMessage: AttackRequest = {
        type: 'attack',
        data: {gameId, x, y, indexPlayer},
        id: 0
      };
      this.handleAttack(ws, attackMessage);
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Random attack failed');
    }
  }
  
  private sendResponse(ws: WebSocket, type: string, data: any): void {
    const response = {
      type,
      data: JSON.stringify(data),
      id: 0
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  private sendError(ws: WebSocket, errorText: string): void {
    this.sendResponse(ws, 'error', {
      error: true,
      errorText
    });
  }
}