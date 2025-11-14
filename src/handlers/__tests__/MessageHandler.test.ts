import { MessageHandler } from '../index';
import { WebSocket } from 'ws';
import { RegRequest, CreateRoomRequest, AddUserToRoomRequest } from '../../types';

const mockPlayerService = {
  registerPlayer: jest.fn(),
  getPlayerBySocket: jest.fn(),
  getPlayerByIndex: jest.fn(),
  getAllPlayers: jest.fn()
};

const mockRoomService = {
  createRoom: jest.fn(),
  addUserToRoom: jest.fn(),
  removePlayerFromRooms: jest.fn(),
  getRoomById: jest.fn(),
  getPlayerRoom: jest.fn(),
  getAllRooms: jest.fn(),
  removeRoom: jest.fn()
};

const mockGameService = {
  createGame: jest.fn(),
  addShips: jest.fn(),
  attack: jest.fn(),
  randomAttack: jest.fn(),
  getGameById: jest.fn(),
  removeGame: jest.fn(),
  isGameReady: jest.fn(),
  isShipKilled: jest.fn(),
  createSinglePlayerGame: jest.fn()
};

const mockWinnerService = {
  addWin: jest.fn(),
  getWinners: jest.fn()
};

const mockNotificationService = {
  updateRooms: jest.fn(),
  updateWinners: jest.fn(),
  sendToPlayer: jest.fn(),
  broadcast: jest.fn()
};

const mockBotService = {
  generateRandomShips: jest.fn(),
  makeBotMove: jest.fn(),
  addBotShips: jest.fn()
};

const mockWebSocket = {
  readyState: 1,
  send: jest.fn(),
  close: jest.fn()
} as unknown as WebSocket;

describe('MessageHandler', () => {
  let messageHandler: MessageHandler;

  beforeEach(() => {
    messageHandler = new MessageHandler(
      mockPlayerService as any,
      mockRoomService as any,
      mockGameService as any,
      mockWinnerService as any,
      mockNotificationService as any,
      mockBotService as any
    );
    jest.clearAllMocks();
  });

  describe('handleRegistration', () => {
    it('should handle registration successfully', () => {
      const regMessage: RegRequest = {
        type: 'reg',
        data: { name: 'test', password: 'pass' },
        id: 0
      };

      mockPlayerService.registerPlayer.mockReturnValue({
        name: 'test',
        index: 1,
        wins: 0
      });

      messageHandler['handleRegistration'](mockWebSocket, regMessage);

      expect(mockPlayerService.registerPlayer).toHaveBeenCalledWith('test', 'pass', mockWebSocket);
      expect(mockNotificationService.updateRooms).toHaveBeenCalled();
      expect(mockNotificationService.updateWinners).toHaveBeenCalled();
    });

    it('should throw error for missing name or password', () => {
      const regMessage: RegRequest = {
        type: 'reg',
        data: { name: '', password: '' },
        id: 0
      };

      expect(() => {
        messageHandler['handleRegistration'](mockWebSocket, regMessage);
      }).toThrow('Name and password are required');
    });
  });

  describe('handleCreateRoom', () => {
    it('should handle create room', () => {
      const createRoomMessage: CreateRoomRequest = {
        type: 'create_room',
        data: '',
        id: 0
      };

      mockPlayerService.getPlayerBySocket.mockReturnValue({
        index: 1,
        name: 'player1'
      });

      messageHandler['handleCreateRoom'](mockWebSocket, createRoomMessage);

      expect(mockRoomService.createRoom).toHaveBeenCalledWith(1, 'player1');
      expect(mockNotificationService.updateRooms).toHaveBeenCalled();
    });
  });

  describe('handleAddUserToRoom', () => {
    it('should handle add user to room', () => {
      const addUserMessage: AddUserToRoomRequest = {
        type: 'add_user_to_room',
        data: { indexRoom: 1 },
        id: 0
      };

      mockPlayerService.getPlayerBySocket.mockReturnValue({
        index: 2,
        name: 'player2'
      });

      mockRoomService.getRoomById.mockReturnValue({
        roomId: 1,
        roomUsers: [{ name: 'player1', index: 1 }]
      });

      messageHandler['handleAddUserToRoom'](mockWebSocket, addUserMessage);

      expect(mockRoomService.addUserToRoom).toHaveBeenCalledWith(1, 2);
      expect(mockNotificationService.updateRooms).toHaveBeenCalled();
    });

    it('should throw error for non-existent room', () => {
      const addUserMessage: AddUserToRoomRequest = {
        type: 'add_user_to_room',
        data: { indexRoom: 999 },
        id: 0
      };

      mockPlayerService.getPlayerBySocket.mockReturnValue({
        index: 1
      });

      mockRoomService.getRoomById.mockReturnValue(undefined);

      expect(() => {
        messageHandler['handleAddUserToRoom'](mockWebSocket, addUserMessage);
      }).toThrow('Room not found');
    });
  });

  describe('handleMessage', () => {
    it('should handle unknown command type', () => {
      const unknownMessage = {
        type: 'unknown_command',
        data: '',
        id: 0
      };

      expect(() => {
        messageHandler.handleMessage(mockWebSocket, unknownMessage as any);
      }).toThrow('Unknown command type: unknown_command');
    });
  });
});