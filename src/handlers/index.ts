import { IGameService, IMessageHandler, INotificationService, IPlayerService, IRoomService, IWinnerService } from "../interfaces";
import { AddShipsRequest, AddUserToRoomRequest, AttackRequest, RandomAttackRequest, RegRequest, Ship, WSRequest } from "../types";
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
          break;
        case 'single_play':
          this.handleSinglePlay(ws);
          break;
        default:
          this.sendError(ws, `Unknown command type: ${message}`);
      }
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleRegistration(ws: WebSocket, message: RegRequest): void {
    
    try {
      const requestData = typeof message.data === 'string' 
      ? JSON.parse(message.data) 
      : message.data;
      const {name, password} = requestData;
      if (!name || !password) {
        throw new Error('Name and password are required');
      }
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
    try {
    this.roomService.createRoom(player.index, player.name);
    this.notificationService.updateRooms();
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Failed to create room');
    }
  }

  private handleAddUserToRoom(ws: WebSocket, message: AddUserToRoomRequest): void {
    const player = this.playerService.getPlayerBySocket(ws);
    if (!player) {
      this.sendError(ws, 'Player not registered');
      return;
    }

    const requestData = typeof message.data === 'string' 
      ? JSON.parse(message.data) 
      : message.data;
  
    const indexRoom = requestData.indexRoom;
  
    if (!indexRoom) {
      this.sendError(ws, 'Room ID is required');
      return;
    }

    try {
      const room = this.roomService.getRoomById(indexRoom);

      if (!room) {
        throw new Error('Room not found');
      }

      const isRoomCreator = room.roomUsers.some(user => user.index === player.index);
      if (isRoomCreator) {
        throw new Error('You cannot join your own room');
      }

      const currentPlayerRoom = this.roomService.getPlayerRoom(player.index);
      if (currentPlayerRoom) {
        this.roomService.removePlayerFromRooms(player.index);
      }

      this.roomService.addUserToRoom(indexRoom, player.index);
      this.notificationService.updateRooms();

      const updatedRoom = this.roomService.getRoomById(indexRoom);
      if (updatedRoom && updatedRoom.roomUsers.length === 2) {
        const game = this.gameService.createGame(room);
        updatedRoom.roomUsers.forEach(user => {
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
      console.error('Error adding user to room:', error);
      this.sendError(ws, error instanceof Error ? error.message : 'Failed to join room');
    }
  }

  private handleAddShips(ws: WebSocket, message: AddShipsRequest): void {
  
  const requestData = typeof message.data === 'string' 
    ? JSON.parse(message.data) 
    : message.data;

    const {gameId, ships, indexPlayer} = requestData;

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
        if (game.playerIds.includes(-1) && game.currentPlayer === -1) {
          setTimeout(() => this.makeBotMove(gameId), 1000);
        }
      }
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Failed to add ships');
    }
  }


  private makeBotMove(gameId: number): void {
    try {
      const game = this.gameService.getGameById(gameId);
      if (!game || game.currentPlayer !== -1) return;
      
      const {x, y} = this.gameService.randomAttack(gameId, -1);
      
      const attackMessage: AttackRequest = {
        type: 'attack',
        data: {
          gameId,
          x,
          y,
          indexPlayer: -1
        },
        id: 0
      };
      this.handleAttack({} as WebSocket, attackMessage);
    } catch (error) {
      console.error('Error making bot move:', error);
    }
  }

  private handleSinglePlay(ws: WebSocket): void {
    const player = this.playerService.getPlayerBySocket(ws);

    if(!player) {
      this.sendError(ws, 'Player not registered');
      return;
    }

    try {
      const game = this.gameService.createSinglePlayerGame(player.index);
      this.addBotShips(game.idGame, -1);
  
      this.sendResponse(ws, 'create_game', {
        idGame: game.idGame,
        idPlayer: player.index
      })
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Failed to create single player game');
    }
  }

  private addBotShips(gameId: number, botIndex: number): void {
    const ships = this.generateRandomShips();
    
    try {
        this.gameService.addShips(gameId, botIndex, ships);
      } catch (error) {
        console.error('Error adding bot ships:', error);
      }
    }
  
  
    private generateRandomShips(): Ship[] {
    const shipTypes = [
      { type: 'huge' as const, length: 4 },
      { type: 'large' as const, length: 3 },
      { type: 'large' as const, length: 3 },
      { type: 'medium' as const, length: 2 },
      { type: 'medium' as const, length: 2 },
      { type: 'medium' as const, length: 2 },
      { type: 'small' as const, length: 1 },
      { type: 'small' as const, length: 1 },
      { type: 'small' as const, length: 1 },
      { type: 'small' as const, length: 1 }
    ];
  
    const ships: Ship[] = [];
    const occupied = new Set<string>();
  
    shipTypes.forEach(shipType => {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        attempts++;
        const direction = Math.random() > 0.5;
        const x = Math.floor(Math.random() * (direction ? 10 : (10 - shipType.length)));
        const y = Math.floor(Math.random() * (direction ? (10 - shipType.length) : 10));
        
        let canPlace = true;
        const positions: {x: number, y: number}[] = [];
        
        for (let i = 0; i < shipType.length; i++) {
          const posX = direction ? x : x + i;
          const posY = direction ? y + i : y;
          const key = `${posX},${posY}`;
          
          if (posX < 0 || posX >= 10 || posY < 0 || posY >= 10 || occupied.has(key)) {
            canPlace = false;
            break;
          }
          
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const neighborX = posX + dx;
              const neighborY = posY + dy;
              if (neighborX >= 0 && neighborX < 10 && neighborY >= 0 && neighborY < 10) {
                const neighborKey = `${neighborX},${neighborY}`;
                if (occupied.has(neighborKey)) {
                  canPlace = false;
                  break;
                }
              }
            }
            if (!canPlace) break;
          }
          
          positions.push({x: posX, y: posY});
        }
        
        if (canPlace) {
          positions.forEach(pos => {
            occupied.add(`${pos.x},${pos.y}`);
          });
          
          ships.push({
            position: { x, y },
            direction,
            length: shipType.length,
            type: shipType.type
          });
          
          placed = true;
        }
      }
    });
    return ships;
  }

  private handleAttack(ws: WebSocket, message: AttackRequest): void {
    const requestData = typeof message.data === 'string' 
    ? JSON.parse(message.data) 
    : message.data;

    const {gameId, x, y, indexPlayer} = requestData;

    try {
      const result = this.gameService.attack(gameId, indexPlayer, x, y);
      const game = this.gameService.getGameById(gameId);

      if (game) {
        game.playerIds.forEach(playerId => {
          if (playerId !== -1) {
            this.notificationService.sendToPlayer(playerId, {
              type: 'attack',
              data: JSON.stringify({
                position: {x, y},
                currentPlayer: indexPlayer,
                status: result.status
              }),
              id: 0
            });
          }
        });

        const opponentId = game.playerIds.find(id => id !== indexPlayer);
        let gameFinished = false;

        if (opponentId) {
          const opponent = game.players.get(opponentId);
          if (opponent && opponent.ships.every(ship => this.gameService['isShipKilled'](ship, opponent.attacks))) {
            this.winnerService.addWin(`${indexPlayer}`);
            this.notificationService.updateWinners();

            game.playerIds.forEach(playerId => {
              if (playerId !== -1) {
                this.notificationService.sendToPlayer(playerId, {
                  type: 'finish',
                  data: JSON.stringify({
                    winPlayer: indexPlayer
                  }),
                  id: 0
                });
              }
            });
            this.gameService.removeGame(gameId);
            gameFinished = true;
          }
        }

        if (!gameFinished && result.nextPlayer !== undefined) {
          game.playerIds.forEach(playerId => {              
            if (playerId !== -1) {
              this.notificationService.sendToPlayer(playerId, {
                type: 'turn',
                data: JSON.stringify({
                  currentPlayer: result.nextPlayer
                }),
                id: 0
              });
            }
          });
          if (result.nextPlayer === -1) {
            this.makeBotMove(gameId);
          }
        }
      }
    } catch (error) {
      console.error('Attack error:', error);
      if (indexPlayer !== -1) {
        this.sendError(ws, error instanceof Error ? error.message : 'Attack failed');
      }
    }
  }

  private handleRandomAttack(ws: WebSocket, message: RandomAttackRequest): void {
  const requestData = typeof message.data === 'string' 
    ? JSON.parse(message.data) 
    : message.data;

  const { gameId, indexPlayer } = requestData;

  try {
    const {x, y} = this.gameService.randomAttack(gameId, indexPlayer);
    
    const attackMessage: AttackRequest = {
      type: 'attack',
      data: {
        gameId,
        x, 
        y,
        indexPlayer
      },
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