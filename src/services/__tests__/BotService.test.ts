import { BotService } from '../BotService';

const mockGameService = {
  createSinglePlayerGame: jest.fn(),
  addShips: jest.fn(),
  getGameById: jest.fn(),
  randomAttack: jest.fn(),
  attack: jest.fn(),
  removeGame: jest.fn()
};

const mockNotificationService = {
  sendToPlayer: jest.fn()
};

describe('BotService', () => {
  let botService: BotService;

  beforeEach(() => {
    botService = new BotService(mockGameService as any, mockNotificationService as any);
    jest.clearAllMocks();
  });

  describe('generateRandomShips', () => {
    it('should generate 10 ships', () => {
      const ships = botService.generateRandomShips();
      
      expect(ships).toHaveLength(10);
    });

    it('should generate ships with correct types and lengths', () => {
      const ships = botService.generateRandomShips();
      
      const hugeShips = ships.filter(ship => ship.type === 'huge');
      const largeShips = ships.filter(ship => ship.type === 'large');
      const mediumShips = ships.filter(ship => ship.type === 'medium');
      const smallShips = ships.filter(ship => ship.type === 'small');

      expect(hugeShips).toHaveLength(1);
      expect(hugeShips[0].length).toBe(4);
      
      expect(largeShips).toHaveLength(2);
      largeShips.forEach(ship => expect(ship.length).toBe(3));
      
      expect(mediumShips).toHaveLength(3);
      mediumShips.forEach(ship => expect(ship.length).toBe(2));
      
      expect(smallShips).toHaveLength(4);
      smallShips.forEach(ship => expect(ship.length).toBe(1));
    });

    it('should generate ships within board boundaries', () => {
      const ships = botService.generateRandomShips();
      
      ships.forEach(ship => {
        const { position, direction, length } = ship;
        
        if (direction) {
          expect(position.y + length).toBeLessThanOrEqual(10);
        } else {
          expect(position.x + length).toBeLessThanOrEqual(10);
        }
        
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThan(10);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeLessThan(10);
      });
    });
  });
});