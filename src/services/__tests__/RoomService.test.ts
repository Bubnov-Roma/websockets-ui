import { RoomService } from '../RoomService';
import { PlayerService } from '../PlayerService';
import { WebSocket } from 'ws';

const mockWebSocket = {
  readyState: 1,
  send: jest.fn(),
  close: jest.fn()
} as unknown as WebSocket;

describe('RoomService', () => {
  let roomService: RoomService;
  let playerService: PlayerService;

  beforeEach(() => {
    playerService = new PlayerService();
    roomService = new RoomService(playerService);
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create new room', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      const room = roomService.createRoom(1);

      expect(room.roomId).toBe(1);
      expect(room.roomUsers).toHaveLength(1);
      expect(room.roomUsers[0].index).toBe(1);
    });

    it('should remove player from existing rooms when creating new room', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      
      const room1 = roomService.createRoom(1);
      const room2 = roomService.createRoom(1);

      expect(room1.roomId).not.toBe(room2.roomId);
      expect(roomService.getAllRooms()).toHaveLength(1);
    });
  });

  describe('addUserToRoom', () => {
    it('should add user to room', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room = roomService.createRoom(1);
      roomService.addUserToRoom(room.roomId, 2);

      expect(room.roomUsers).toHaveLength(2);
      expect(room.roomUsers[1].index).toBe(2);
    });

    it('should throw error for non-existent room', () => {
      expect(() => {
        roomService.addUserToRoom(999, 1);
      }).toThrow('Room not found');
    });

    it('should throw error for full room', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      playerService.registerPlayer('player3', 'pass', mockWebSocket);
      
      const room = roomService.createRoom(1);
      roomService.addUserToRoom(room.roomId, 2);

      expect(() => {
        roomService.addUserToRoom(room.roomId, 3);
      }).toThrow('Room is full');
    });
  });

  describe('removePlayerFromRooms', () => {
    it('should remove player from all rooms', () => {
      playerService.registerPlayer('player1', 'pass', mockWebSocket);
      playerService.registerPlayer('player2', 'pass', mockWebSocket);
      
      const room = roomService.createRoom(1);
      roomService.addUserToRoom(room.roomId, 2);

      expect(room.roomUsers).toHaveLength(2);

      roomService.removePlayerFromRooms(1);
      const updatedRoom = roomService.getRoomById(room.roomId);

      expect(updatedRoom?.roomUsers).toHaveLength(1);
      expect(updatedRoom?.roomUsers[0].index).toBe(2);
    });
  });
});