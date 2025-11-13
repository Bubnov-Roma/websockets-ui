import { IGameService, INotificationService } from '../interfaces';
import { Ship } from '../types';

export class BotService {
  constructor(
    private gameService: IGameService,
    private notificationService: INotificationService
  ) {}

  generateRandomShips(): Ship[] {
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

  async makeBotMove(gameId: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const game = this.gameService.getGameById(gameId);
          if (!game || game.currentPlayer !== -1) {
            resolve();
            return;
          }
          
          const { x, y } = this.gameService.randomAttack(gameId, -1);

          const result = this.gameService.attack(gameId, -1, x, y);
          console.log(`🤖 Bot attacking at (${x}, ${y}), attack result: ${result.status}`);

          game.playerIds.forEach(playerId => {
            if (playerId !== -1) {
              this.notificationService.sendToPlayer(playerId, {
                type: 'attack',
                data: JSON.stringify({
                  position: { x, y },
                  currentPlayer: -1,
                  status: result.status
                }),
                id: 0
              });
            }
          });

          const opponentId = game.playerIds.find(id => id !== -1);
          if (opponentId) {
            const opponent = game.players.get(opponentId);
            if (opponent && opponent.ships.every(ship => this.gameService['isShipKilled'](ship, opponent.attacks))) {
              console.log(`🎉 Game finished! Bot wins! 🤖`);
              this.notificationService.sendToPlayer(opponentId, {
                type: 'finish',
                data: JSON.stringify({
                  winPlayer: -1
                }),
                id: 0
              });
              this.gameService.removeGame(gameId);
              resolve();
              return;
            }
          }

          if (result.nextPlayer !== undefined) {
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
              setTimeout(() => {
                this.makeBotMove(gameId).then(resolve);
              }, 1000);
              return;
            }
          }
          resolve();
        } catch (error) {
          resolve();
        }
      }, 1500);
    });
  }

  addBotShips(gameId: number): void {
    try {
      const ships = this.generateRandomShips();
      this.gameService.addShips(gameId, -1, ships);
    } catch (error) {
      console.error('🤖 Error adding bot ships:', error);
    }
  }
}