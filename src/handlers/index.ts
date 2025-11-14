import { 
  IBotService, 
  IGameService, 
  IMessageHandler, 
  INotificationService, 
  IPlayerService, 
  IRoomService, 
  IWinnerService 
} from "../interfaces";
import { 
  AddShipsRequest, 
  AddUserToRoomRequest, 
  AttackRequest, 
  RandomAttackRequest, 
  RegRequest, 
  SinglePlayRequest,
  CreateRoomRequest,
  WSRequest,
  Player,
  Room,
  Game,
  Ship,
} from "../types";
import { WebSocket } from 'ws';

type MessageHandlers = {
  [K in WSRequest['type']]: (message: Extract<WSRequest, { type: K }>) => void | Promise<void>;
};

type AttackResultData = {
  status: 'miss' | 'shot' | 'killed' | 'already_attacked' | 'not_your_turn';
  nextPlayer?: number;
  killedShip?: Ship | null;
  additionalAttacks?: Array<{ x: number; y: number; status: 'miss' }>;
};

type GameStartData = {
  ships: Ship[];
  currentPlayerIndex: number;
};

type AttackData = {
  position: { x: number; y: number };
  currentPlayer: number;
  status: 'miss' | 'killed' | 'shot';
};

type GameCompletionResult = {
  isFinished: boolean;
  winnerIndex?: number;
};

export class MessageHandler implements IMessageHandler {
  constructor(
    private readonly playerService: IPlayerService,
    private readonly roomService: IRoomService,
    private readonly gameService: IGameService,
    private readonly winnerService: IWinnerService,
    private readonly notificationService: INotificationService,
    private readonly botService: IBotService
  ) {}

  public handleMessage(ws: WebSocket, message: WSRequest): void {
    const handlers: MessageHandlers = {
      'reg': (msg: RegRequest) => this.handleRegistration(ws, msg),
      'create_room': (msg: CreateRoomRequest) => this.handleCreateRoom(ws, msg),
      'add_user_to_room': (msg: AddUserToRoomRequest) => this.handleAddUserToRoom(ws, msg),
      'add_ships': (msg: AddShipsRequest) => this.handleAddShips(msg),
      'attack': (msg: AttackRequest) => this.handleAttack(msg),
      'randomAttack': (msg: RandomAttackRequest) => this.handleRandomAttack(ws, msg),
      'single_play': (msg: SinglePlayRequest) => this.handleSinglePlay(ws, msg),
    };

    const handler = handlers[message.type];
    if (!handler) {
      throw new Error(`Unknown command type: ${message.type}`);
    }

    handler(message as any);
  }

  private parseMessageData<T>(data: string | T): T {
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  private getPlayerBySocket(ws: WebSocket): Player {
    const player = this.playerService.getPlayerBySocket(ws);
    if (!player) {
      throw new Error('Player not registered');
    }
    return player;
  }

  private sendResponse<T>(ws: WebSocket, type: string, data: T): void {
    const response = {
      type,
      data: JSON.stringify(data),
      id: 0 as const
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  private handleRegistration(ws: WebSocket, message: RegRequest): void {
    const requestData = this.parseMessageData<{ name: string; password: string }>(message.data);
    const { name, password } = requestData;
    
    if (!name?.trim() || !password?.trim()) {
      throw new Error('Name and password are required');
    }

    const player: Player = this.playerService.registerPlayer(name.trim(), password.trim(), ws);
    
    this.sendResponse(ws, 'reg', {
      name: player.name,
      index: player.index,
      error: false,
      errorText: ''
    });

    this.notificationService.updateRooms();
    this.notificationService.updateWinners();
  }

  private handleCreateRoom(ws: WebSocket, message: CreateRoomRequest): void {
    const player: Player = this.getPlayerBySocket(ws);
    this.roomService.createRoom(player.index, player.name);
    this.notificationService.updateRooms();
  }

  private handleAddUserToRoom(ws: WebSocket, message: AddUserToRoomRequest): void {
    const player: Player = this.getPlayerBySocket(ws);
    const requestData = this.parseMessageData<{ indexRoom: number }>(message.data);
    const { indexRoom } = requestData;

    if (!indexRoom || indexRoom <= 0) {
      throw new Error('Valid Room ID is required');
    }

    const room: Room | undefined = this.roomService.getRoomById(indexRoom);
    if (!room) {
      throw new Error('Room not found');
    }

    this.validateRoomJoin(player.index, room);
    this.joinRoom(player.index, indexRoom, room);
  }

  private async handleAddShips(message: AddShipsRequest): Promise<void> {
    const requestData = this.parseMessageData<{ 
      gameId: number; 
      ships: Ship[]; 
      indexPlayer: number;
    }>(message.data);
    
    const { gameId, ships, indexPlayer } = requestData;
    
    this.gameService.addShips(gameId, indexPlayer, ships);
    await this.startGameIfReady(gameId);
  }

  private handleSinglePlay(ws: WebSocket, message: SinglePlayRequest): void {
    const player: Player = this.getPlayerBySocket(ws);
    const game: Game = this.gameService.createSinglePlayerGame(player.index);
    
    this.botService.addBotShips(game.idGame);
    
    this.sendResponse(ws, 'create_game', {
      idGame: game.idGame,
      idPlayer: player.index
    });
  }

  private async handleAttack(message: AttackRequest): Promise<void> {
    const requestData = this.parseMessageData<{ 
      gameId: number; 
      x: number; 
      y: number; 
      indexPlayer: number;
    }>(message.data);
    
    const { gameId, x, y, indexPlayer } = requestData;
    
    if (x < 0 || x > 9 || y < 0 || y > 9) {
      throw new Error('Invalid coordinates');
    }

    const result: AttackResultData = this.gameService.attack(gameId, indexPlayer, x, y);

    if (result.status === 'already_attacked' || result.status === 'not_your_turn') {
      return;
    }

    await this.processAttackResult(gameId, indexPlayer, result, x, y);
  }

  private handleRandomAttack(ws: WebSocket, message: RandomAttackRequest): void {
    const requestData = this.parseMessageData<{ 
      gameId: number; 
      indexPlayer: number;
    }>(message.data);
    
    const { gameId, indexPlayer } = requestData;
    const { x, y } = this.gameService.randomAttack(gameId, indexPlayer);
    
    const attackMessage: AttackRequest = {
      type: 'attack',
      data: { gameId, x, y, indexPlayer },
      id: 0
    };
    
    this.handleAttack(attackMessage);
  }

  private validateRoomJoin(playerIndex: number, room: Room): void {
    const isRoomCreator: boolean = room.roomUsers.some((user) => user.index === playerIndex);
    if (isRoomCreator) {
      throw new Error('You cannot join your own room');
    }

    if (room.roomUsers.length >= 2) {
      throw new Error('Room is full');
    }
  }

  private joinRoom(playerIndex: number, roomId: number, room: Room): void {
    const currentPlayerRoom: Room | undefined = this.roomService.getPlayerRoom(playerIndex);
    if (currentPlayerRoom) {
      this.roomService.removePlayerFromRooms(playerIndex);
    }

    this.roomService.addUserToRoom(roomId, playerIndex);
    this.notificationService.updateRooms();

    const updatedRoom: Room | undefined = this.roomService.getRoomById(roomId);
    if (updatedRoom && updatedRoom.roomUsers.length === 2) {
      this.startGame(updatedRoom);
    }
  }

  private startGame(room: Room): void {
    const game: Game = this.gameService.createGame(room);
    
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

    this.roomService.removeRoom(room.roomId);
    this.notificationService.updateRooms();
  }

  private async startGameIfReady(gameId: number): Promise<void> {
    const game: Game | undefined = this.gameService.getGameById(gameId);
    if (!game || !this.gameService.isGameReady(gameId)) {
      return;
    }

    this.sendGameStartData(game);
    
    if (game.playerIds.includes(-1) && game.currentPlayer === -1) {
      await this.botService.makeBotMove(gameId);
    }
  }

  private sendGameStartData(game: Game): void {
    game.playerIds.forEach(playerId => {
      if (playerId !== -1) {
        const playerData = game.players.get(playerId);
        if (playerData) {
          const gameStartData: GameStartData = {
            ships: playerData.ships,
            currentPlayerIndex: playerId
          };

          this.notificationService.sendToPlayer(playerId, {
            type: 'start_game',
            data: JSON.stringify(gameStartData),
            id: 0
          });

          this.notificationService.sendToPlayer(playerId, {
            type: 'turn',
            data: JSON.stringify({
              currentPlayer: game.currentPlayer
            }),
            id: 0
          });
        }
      }
    });
  }

  private async processAttackResult(
    gameId: number, 
    attackerIndex: number, 
    result: AttackResultData,
    x: number,
    y: number
  ): Promise<void> {
    const game: Game | undefined = this.gameService.getGameById(gameId);
    if (!game) return;

    this.sendAttackResults(game, attackerIndex, result, x, y);
    
    const gameCompletion: GameCompletionResult = this.checkGameCompletion(game, attackerIndex);
    
    if (!gameCompletion.isFinished && result.nextPlayer !== undefined) {
      this.sendTurnUpdate(game, result.nextPlayer);
      
      if (result.nextPlayer === -1) {
        await this.botService.makeBotMove(gameId);
      }
    }
  }

  private sendAttackResults(
    game: Game, 
    attackerIndex: number, 
    result: AttackResultData,
    x: number,
    y: number
  ): void {
    const attackData: AttackData = {
      position: { x, y },
      currentPlayer: attackerIndex,
      status: result.status as 'miss' | 'killed' | 'shot'
    };

    this.sendToAllPlayers(game, {
      type: 'attack',
      data: JSON.stringify(attackData),
      id: 0
    });

    if (result.additionalAttacks && result.additionalAttacks.length > 0) {
      result.additionalAttacks.forEach(attack => {
        const additionalAttackData: AttackData = {
          position: { x: attack.x, y: attack.y },
          currentPlayer: attackerIndex,
          status: attack.status
        };

        this.sendToAllPlayers(game, {
          type: 'attack',
          data: JSON.stringify(additionalAttackData),
          id: 0
        });
      });
    }
  }

  private checkGameCompletion(game: Game, attackerIndex: number): GameCompletionResult {
    const opponentId: number | undefined = game.playerIds.find(id => id !== attackerIndex);
    if (!opponentId) {
      return { isFinished: false };
    }

    const opponent = game.players.get(opponentId);
    if (!opponent || !opponent.ships.every(ship => 
      this.gameService.isShipKilled(ship, opponent.attacks))
    ) {
      return { isFinished: false };
    }

    if (attackerIndex !== -1) {
      const winnerPlayer: Player | undefined = this.playerService.getPlayerByIndex(attackerIndex);
      if (winnerPlayer) {
        this.winnerService.addWin(winnerPlayer.name);
      }
    }

    this.notificationService.updateWinners();
    
    this.sendToAllPlayers(game, {
      type: 'finish',
      data: JSON.stringify({ winPlayer: attackerIndex }),
      id: 0
    });

    this.gameService.removeGame(game.idGame);
    return { isFinished: true, winnerIndex: attackerIndex };
  }

  private sendTurnUpdate(game: Game, nextPlayer: number): void {
    this.sendToAllPlayers(game, {
      type: 'turn',
      data: JSON.stringify({ currentPlayer: nextPlayer }),
      id: 0
    });
  }

  private sendToAllPlayers(game: Game, message: { type: string; data: string; id: number }): void {
    game.playerIds.forEach(playerId => {
      if (playerId !== -1) {
        this.notificationService.sendToPlayer(playerId, message);
      }
    });
  }
}