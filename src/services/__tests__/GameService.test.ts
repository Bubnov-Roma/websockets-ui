import { GameService } from '../GameService';
import { PlayerService } from '../PlayerService';
import { RoomService } from '../RoomService';
import { Ship, Room } from '../../types';
import { WebSocket } from 'ws';

const mockWebSocket = {
  readyState: 1,
  send: jest.fn(),
  close: jest.fn()
} as unknown as WebSocket;

const createSingleTestShip = (): Ship[] => [
  {
    position: { x: 0, y: 0 },
    direction: true,
    length: 1,
    type: 'small' as const
  }
];

const createFullTestShips = (): Ship[] => [
  {
    position: { x: 0, y: 0 },
    direction: true,
    length: 1,
    type: 'small'
  },
  {
    position: { x: 2, y: 0 },
    direction: true,
    length: 1,
    type: 'small'
  },
  {
    position: { x: 4, y: 0 },
    direction: true,
    length: 1,
    type: 'small'
  },
  {
    position: { x: 6, y: 0 },
    direction: true,
    length: 1,
    type: 'small'
  },
  {
    position: { x: 0, y: 2 },
    direction: true,
    length: 2,
    type: 'medium'
  },
  {
    position: { x: 3, y: 2 },
    direction: true,
    length: 2,
    type: 'medium'
  },
  {
    position: { x: 6, y: 2 },
    direction: true,
    length: 2,
    type: 'medium'
  },
  {
    position: { x: 0, y: 5 },
    direction: true,
    length: 3,
    type: 'large'
  },
  {
    position: { x: 4, y: 5 },
    direction: true,
    length: 3,
    type: 'large'
  },
  {
    position: { x: 0, y: 8 },
    direction: true,
    length: 4,
    type: 'huge'
  }
];

describe('GameService', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let roomService: RoomService;

  beforeEach(() => {
    playerService = new PlayerService();
    roomService = new RoomService(playerService);
    gameService = new GameService(playerService);
    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('should create game from room', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room: Room = {
        roomId: 1,
        roomUsers: [
          { name: 'player1', index: 1 },
          { name: 'player2', index: 2 }
        ]
      };

      const game = gameService.createGame(room);

      expect(game.idGame).toBe(1);
      expect(game.playerIds).toHaveLength(2);
      expect(game.players.has(1)).toBe(true);
      expect(game.players.has(2)).toBe(true);
    });
  });

  describe('addShips', () => {
    it('should add ships to player', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room: Room = {
        roomId: 1,
        roomUsers: [
          { name: 'player1', index: 1 },
          { name: 'player2', index: 2 }
        ]
      };

      const game = gameService.createGame(room);
      const ships = createSingleTestShip();
      gameService.addShips(game.idGame, 1, ships);

      const playerData = game.players.get(1);
      expect(playerData?.ships).toHaveLength(1);
      expect(playerData?.ships[0].type).toBe('small');
    });

    it('should throw error for non-existent game', () => {
      const ships = createSingleTestShip();
      
      expect(() => {
        gameService.addShips(999, 1, ships);
      }).toThrow('Game not found');
    });
  });

  describe('attack', () => {
    let gameId: number;
    let game: any;

    beforeEach(() => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room: Room = {
        roomId: 1,
        roomUsers: [
          { name: 'player1', index: 1 },
          { name: 'player2', index: 2 }
        ]
      };

      game = gameService.createGame(room);
      gameId = game.idGame;

      const ships1: Ship[] = [{
        position: { x: 0, y: 0 },
        direction: true,
        length: 1,
        type: 'small'
      }];

      const ships2: Ship[] = [{
        position: { x: 5, y: 5 },
        direction: true,
        length: 1,
        type: 'small'
      }];

      gameService.addShips(gameId, 1, ships1);
      gameService.addShips(gameId, 2, ships2);

      game.currentPlayer = 1;
    });

    it('should hit ship', () => {
      const result = gameService.attack(gameId, 1, 5, 5);

      expect(result.status).toBe('killed');
    });

    it('should miss ship', () => {
      const result = gameService.attack(gameId, 1, 1, 1);

      expect(result.status).toBe('miss');
    });

    it('should return not your turn when wrong player attacks', () => {
      game.currentPlayer = 1;

      const result = gameService.attack(gameId, 2, 5, 5);

      expect(result.status).toBe('not_your_turn');
    });

    it('should return already_attacked when attacking same cell twice', () => {
      gameService.attack(gameId, 1, 5, 5);
      game.currentPlayer = 1;
      const result = gameService.attack(gameId, 1, 5, 5);

      expect(result.status).toBe('already_attacked');
    });
  });

  describe('isShipKilled', () => {
    it('should return true when all ship positions are hit', () => {
      const ship: Ship = {
        position: { x: 0, y: 0 },
        direction: true,
        length: 2,
        type: 'medium'
      };

      const attacks = new Set<string>(['0,0', '0,1']);

      const isKilled = gameService.isShipKilled(ship, attacks);
      expect(isKilled).toBe(true);
    });

    it('should return false when not all ship positions are hit', () => {
      const ship: Ship = {
        position: { x: 0, y: 0 },
        direction: true,
        length: 2,
        type: 'medium'
      };

      const attacks = new Set<string>(['0,0']);

      const isKilled = gameService.isShipKilled(ship, attacks);
      expect(isKilled).toBe(false);
    });
  });

  describe('createSinglePlayerGame', () => {
    it('should create single player game with bot', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      
      const game = gameService.createSinglePlayerGame(1);

      expect(game.idGame).toBe(1);
      expect(game.playerIds).toContain(1);
      expect(game.playerIds).toContain(-1);
      expect(game.players.has(1)).toBe(true);
      expect(game.players.has(-1)).toBe(true);
    });
  });

  describe('randomAttack', () => {
    it('should generate random coordinates within bounds', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room: Room = {
        roomId: 1,
        roomUsers: [
          { name: 'player1', index: 1 },
          { name: 'player2', index: 2 }
        ]
      };

      const game = gameService.createGame(room);
      const gameId = game.idGame;

      const ships: Ship[] = [{
        position: { x: 0, y: 0 },
        direction: true,
        length: 1,
        type: 'small'
      }];
      gameService.addShips(gameId, 2, ships);

      const { x, y } = gameService.randomAttack(gameId, 1);

      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(10);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(10);
    });
  });

  describe('isGameReady', () => {
    it('should return true when all players have ships', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room: Room = {
        roomId: 1,
        roomUsers: [
          { name: 'player1', index: 1 },
          { name: 'player2', index: 2 }
        ]
      };

      const game = gameService.createGame(room);
      const ships = createSingleTestShip();

      gameService.addShips(game.idGame, 1, ships);
      gameService.addShips(game.idGame, 2, ships);

      const isReady = gameService.isGameReady(game.idGame);
      expect(isReady).toBe(true);
    });

    it('should return false when not all players have ships', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room: Room = {
        roomId: 1,
        roomUsers: [
          { name: 'player1', index: 1 },
          { name: 'player2', index: 2 }
        ]
      };

      const game = gameService.createGame(room);
      const ships = createSingleTestShip();

      gameService.addShips(game.idGame, 1, ships);
      const isReady = gameService.isGameReady(game.idGame);
      expect(isReady).toBe(false);
    });
  });
});