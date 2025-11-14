import { PlayerService } from '../PlayerService';
import { WebSocket } from 'ws';

const mockWebSocket = {
  readyState: 1,
  send: jest.fn(),
  close: jest.fn()
} as unknown as WebSocket;

describe('PlayerService', () => {
  let playerService: PlayerService;

  beforeEach(() => {
    playerService = new PlayerService();
    jest.clearAllMocks();
  });

  describe('registerPlayer', () => {
    it('should register new player', () => {
      const player = playerService.registerPlayer('test', 'password', mockWebSocket);

      expect(player.name).toBe('test');
      expect(player.index).toBe(1);
      expect(player.wins).toBe(0);
    });

    it('should return existing player with same credentials', () => {
      const player1 = playerService.registerPlayer('test', 'password', mockWebSocket);
      const player2 = playerService.registerPlayer('test', 'password', mockWebSocket);

      expect(player1.index).toBe(player2.index);
      expect(player1.name).toBe(player2.name);
    });

    it('should throw error for wrong password', () => {
      playerService.registerPlayer('test', 'password', mockWebSocket);
      
      expect(() => {
        playerService.registerPlayer('test', 'wrong', mockWebSocket);
      }).toThrow('Invalid password');
    });
  });

  describe('getPlayer methods', () => {
    beforeEach(() => {
      playerService.registerPlayer('test', 'password', mockWebSocket);
    });

    it('should get player by name', () => {
      const player = playerService.getPlayerByName('test');
      expect(player).toBeDefined();
      expect(player?.name).toBe('test');
    });

    it('should get player by index', () => {
      const player = playerService.getPlayerByIndex(1);
      expect(player).toBeDefined();
      expect(player?.index).toBe(1);
    });

    it('should get player by socket', () => {
      const player = playerService.getPlayerBySocket(mockWebSocket);
      expect(player).toBeDefined();
      expect(player?.socket).toBe(mockWebSocket);
    });

    it('should get all players', () => {
      const players = playerService.getAllPlayers();
      expect(players).toHaveLength(1);
      expect(players[0].name).toBe('test');
    });
  });

  describe('removePlayer', () => {
    it('should remove player by index', () => {
      const player = playerService.registerPlayer('test', 'password', mockWebSocket);
      expect(playerService.getPlayerByIndex(1)).toBeDefined();

      playerService.removePlayer(1);
      expect(playerService.getPlayerByIndex(1)).toBeUndefined();
    });
  });
});