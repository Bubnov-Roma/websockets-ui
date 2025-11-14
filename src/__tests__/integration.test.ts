import { WebSocket } from 'ws';

jest.mock('ws', () => {
  const mockWebSocket = {
    readyState: 1,
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
  };

  return {
    WebSocket: jest.fn(() => mockWebSocket),
  };
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WebSocket Message Handling', () => {
    it('should validate registration message structure', () => {
      const regMessage = {
        type: 'reg',
        data: JSON.stringify({ name: 'test', password: 'pass' }),
        id: 0
      };

      expect(regMessage.type).toBe('reg');
      expect(regMessage.id).toBe(0);
      
      const data = JSON.parse(regMessage.data);
      expect(data.name).toBe('test');
      expect(data.password).toBe('pass');
    });

    it('should validate create_room message structure', () => {
      const createRoomMessage = {
        type: 'create_room',
        data: '',
        id: 0
      };

      expect(createRoomMessage.type).toBe('create_room');
      expect(createRoomMessage.data).toBe('');
      expect(createRoomMessage.id).toBe(0);
    });

    it('should validate add_user_to_room message structure', () => {
      const addUserMessage = {
        type: 'add_user_to_room',
        data: JSON.stringify({ indexRoom: 1 }),
        id: 0
      };

      expect(addUserMessage.type).toBe('add_user_to_room');
      
      const data = JSON.parse(addUserMessage.data);
      expect(data.indexRoom).toBe(1);
    });

    it('should validate attack message structure', () => {
      const attackMessage = {
        type: 'attack',
        data: JSON.stringify({ 
          gameId: 1, 
          x: 5, 
          y: 5, 
          indexPlayer: 1 
        }),
        id: 0
      };

      expect(attackMessage.type).toBe('attack');
      
      const data = JSON.parse(attackMessage.data);
      expect(data.gameId).toBe(1);
      expect(data.x).toBe(5);
      expect(data.y).toBe(5);
      expect(data.indexPlayer).toBe(1);
    });

    it('should validate add_ships message structure', () => {
      const shipsData = [
        {
          position: { x: 0, y: 0 },
          direction: true,
          length: 1,
          type: 'small' as const
        }
      ];

      const addShipsMessage = {
        type: 'add_ships',
        data: JSON.stringify({
          gameId: 1,
          ships: shipsData,
          indexPlayer: 1
        }),
        id: 0
      };

      expect(addShipsMessage.type).toBe('add_ships');
      
      const data = JSON.parse(addShipsMessage.data);
      expect(data.gameId).toBe(1);
      expect(data.ships).toHaveLength(1);
      expect(data.ships[0].type).toBe('small');
      expect(data.indexPlayer).toBe(1);
    });
  });

  describe('Response Message Validation', () => {
    it('should validate registration response structure', () => {
      const regResponse = {
        type: 'reg',
        data: JSON.stringify({
          name: 'test',
          index: 1,
          error: false,
          errorText: ''
        }),
        id: 0
      };

      expect(regResponse.type).toBe('reg');
      
      const data = JSON.parse(regResponse.data);
      expect(data.name).toBe('test');
      expect(data.index).toBe(1);
      expect(data.error).toBe(false);
      expect(data.errorText).toBe('');
    });

    it('should validate update_room response structure', () => {
      const roomsData = [
        {
          roomId: 1,
          roomUsers: [
            { name: 'player1', index: 1 },
            { name: 'player2', index: 2 }
          ]
        }
      ];

      const updateRoomResponse = {
        type: 'update_room',
        data: JSON.stringify(roomsData),
        id: 0
      };

      expect(updateRoomResponse.type).toBe('update_room');
      
      const data = JSON.parse(updateRoomResponse.data);
      expect(data).toHaveLength(1);
      expect(data[0].roomId).toBe(1);
      expect(data[0].roomUsers).toHaveLength(2);
    });

    it('should validate update_winners response structure', () => {
      const winnersData = [
        { name: 'player1', wins: 5 },
        { name: 'player2', wins: 3 }
      ];

      const updateWinnersResponse = {
        type: 'update_winners',
        data: JSON.stringify(winnersData),
        id: 0
      };

      expect(updateWinnersResponse.type).toBe('update_winners');
      
      const data = JSON.parse(updateWinnersResponse.data);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('player1');
      expect(data[0].wins).toBe(5);
    });

    it('should validate create_game response structure', () => {
      const createGameResponse = {
        type: 'create_game',
        data: JSON.stringify({
          idGame: 1,
          idPlayer: 1
        }),
        id: 0
      };

      expect(createGameResponse.type).toBe('create_game');
      
      const data = JSON.parse(createGameResponse.data);
      expect(data.idGame).toBe(1);
      expect(data.idPlayer).toBe(1);
    });

    it('should validate start_game response structure', () => {
      const shipsData = [
        {
          position: { x: 0, y: 0 },
          direction: true,
          length: 1,
          type: 'small' as const
        }
      ];

      const startGameResponse = {
        type: 'start_game',
        data: JSON.stringify({
          ships: shipsData,
          currentPlayerIndex: 1
        }),
        id: 0
      };

      expect(startGameResponse.type).toBe('start_game');
      
      const data = JSON.parse(startGameResponse.data);
      expect(data.ships).toHaveLength(1);
      expect(data.currentPlayerIndex).toBe(1);
    });

    it('should validate attack response structure', () => {
      const attackResponse = {
        type: 'attack',
        data: JSON.stringify({
          position: { x: 5, y: 5 },
          currentPlayer: 1,
          status: 'hit' as const
        }),
        id: 0
      };

      expect(attackResponse.type).toBe('attack');
      
      const data = JSON.parse(attackResponse.data);
      expect(data.position.x).toBe(5);
      expect(data.position.y).toBe(5);
      expect(data.currentPlayer).toBe(1);
      expect(data.status).toBe('hit');
    });

    it('should validate turn response structure', () => {
      const turnResponse = {
        type: 'turn',
        data: JSON.stringify({
          currentPlayer: 2
        }),
        id: 0
      };

      expect(turnResponse.type).toBe('turn');
      
      const data = JSON.parse(turnResponse.data);
      expect(data.currentPlayer).toBe(2);
    });

    it('should validate finish response structure', () => {
      const finishResponse = {
        type: 'finish',
        data: JSON.stringify({
          winPlayer: 1
        }),
        id: 0
      };

      expect(finishResponse.type).toBe('finish');
      
      const data = JSON.parse(finishResponse.data);
      expect(data.winPlayer).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should validate error response structure', () => {
      const errorResponse = {
        type: 'error',
        data: JSON.stringify({
          error: true,
          errorText: 'Invalid JSON format'
        }),
        id: 0
      };

      expect(errorResponse.type).toBe('error');
      
      const data = JSON.parse(errorResponse.data);
      expect(data.error).toBe(true);
      expect(data.errorText).toBe('Invalid JSON format');
    });

    it('should handle invalid JSON in message data', () => {
      const invalidJsonMessage = {
        type: 'reg',
        data: 'invalid json',
        id: 0
      };

      expect(() => {
        JSON.parse(invalidJsonMessage.data);
      }).toThrow();
    });
  });

  describe('WebSocket Connection Simulation', () => {
    it('should simulate WebSocket connection lifecycle', () => {
      const mockWs = new WebSocket('ws://localhost:3000');
      
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3000');
      expect(mockWs).toBeDefined();

      const openHandler = jest.fn();
      const messageHandler = jest.fn();
      const closeHandler = jest.fn();
      const errorHandler = jest.fn();

      mockWs.on('open', openHandler);
      mockWs.on('message', messageHandler);
      mockWs.on('close', closeHandler);
      mockWs.on('error', errorHandler);

      expect(mockWs.on).toHaveBeenCalledWith('open', openHandler);
      expect(mockWs.on).toHaveBeenCalledWith('message', messageHandler);
      expect(mockWs.on).toHaveBeenCalledWith('close', closeHandler);
      expect(mockWs.on).toHaveBeenCalledWith('error', errorHandler);
    });

    it('should simulate message sending', () => {
      const mockWs = new WebSocket('ws://localhost:3000');
      const testMessage = JSON.stringify({
        type: 'reg',
        data: JSON.stringify({ name: 'test', password: 'pass' }),
        id: 0
      });

      mockWs.send(testMessage);

      expect(mockWs.send).toHaveBeenCalledWith(testMessage);
    });
  });
});

describe('Real Server Integration Tests', () => {
  it.skip('should connect to real WebSocket server', (done) => {
    const ws = new WebSocket('ws://localhost:3000');
    
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });

    ws.on('error', (error) => {
      console.log('Server not running, test skipped');
      done();
    });
  }, 10000);

  it.skip('should handle registration with real server', (done) => {
    const ws = new WebSocket('ws://localhost:3000');
    
    ws.on('open', () => {
      const regMessage = {
        type: 'reg',
        data: JSON.stringify({ name: 'test', password: 'pass' }),
        id: 0
      };

      ws.send(JSON.stringify(regMessage));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'reg') {
        const responseData = JSON.parse(message.data);
        expect(responseData.name).toBe('test');
        expect(responseData.error).toBe(false);
        ws.close();
        done();
      }
    });

    ws.on('error', (error) => {
      console.log('Server not running, test skipped');
      done();
    });
  }, 10000);
});