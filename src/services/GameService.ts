import { IGameService } from '../interfaces';
import { Game, Room, Ship } from '../types';
import { PlayerService } from './PlayerService';

export class GameService implements IGameService {
  private games: Map<number, Game> = new Map();
  private gameIdCounter = 1;

  constructor(private playerService: PlayerService) {}

  createGame(room: Room): Game {
    const game: Game = {
      idGame: this.gameIdCounter++,
      players: new Map(),
      currentPlayer: 0,
      playerIds: []
    };
    
    room.roomUsers.forEach(user => {
      const player = this.playerService.getPlayerByIndex(user.index);
      if (player && player.socket) {
        game.players.set(player.index, {
          socket: player.socket,
          ships: [],
          board: this.createEmptyBoard(),
          attacks: new Set()
        });
        game.playerIds.push(player.index);
      }
    });

    game.currentPlayer = game.playerIds[Math.floor(Math.random() * game.playerIds.length)];
    
    this.games.set(game.idGame, game);
    return game;
  }

  addShips(gameId: number, playerIndex: number, ships: Ship[]): void {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    const player = game.players.get(playerIndex);
    if (!player) {
      throw new Error('Player not in game');
    }
    
    player.ships = ships;
    this.placeShipsOnBoard(player.board, ships);
  }

  attack(gameId: number, attackerIndex: number, x: number, y: number): { status: 'miss' | 'shot' | 'killed', nextPlayer?: number } {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.currentPlayer !== attackerIndex) {
      throw new Error('Not your turn');
    }
    
    const opponentId = game.playerIds.find(id => id !== attackerIndex);
    if (!opponentId) {
      throw new Error('Opponent not found');
    }
    
    const opponent = game.players.get(opponentId);
    if (!opponent) {
      throw new Error('Opponent data not found');
    }
    
    const attackKey = `${x},${y}`;
    if (opponent.attacks.has(attackKey)) {
      throw new Error('Cell already attacked');
    }
    
    opponent.attacks.add(attackKey);
    
    let status: 'miss' | 'shot' | 'killed' = 'miss';
    const shipHit = opponent.ships.find(ship => this.checkShipHit(ship, x, y));
    
    if (shipHit) {
      if (this.isShipKilled(shipHit, opponent.attacks)) {
        status = 'killed';
        this.markAroundShipAsMissed(shipHit, opponent.attacks);
      } else {
        status = 'shot';
      }
    }
    
    let nextPlayer: number | undefined;
    if (status === 'miss') {
      game.currentPlayer = opponentId;
      nextPlayer = opponentId;
    }

    const allShipsKilled = opponent.ships.every(ship => 
      this.isShipKilled(ship, opponent.attacks)
    );
    
    if (allShipsKilled) {
      this.removeGame(gameId);
      return { status, nextPlayer };
    }
    
    return { status, nextPlayer };
  }

  randomAttack(gameId: number, attackerIndex: number): { x: number; y: number } {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    const opponentId = game.playerIds.find(id => id !== attackerIndex);
    if (!opponentId) {
      throw new Error('Opponent not found');
    }
    
    const opponent = game.players.get(opponentId);
    if (!opponent) {
      throw new Error('Opponent data not found');
    }
    
    let x: number, y: number;
    let attackKey: string;
    
    do {
      x = Math.floor(Math.random() * 10);
      y = Math.floor(Math.random() * 10);
      attackKey = `${x},${y}`;
    } while (opponent.attacks.has(attackKey));
    
    return { x, y };
  }

  getGameById(gameId: number): Game | undefined {
    return this.games.get(gameId);
  }

  removeGame(gameId: number): void {
    this.games.delete(gameId);
  }

  isGameReady(gameId: number): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;
    
    return game.playerIds.every(id => {
      const player = game.players.get(id);
      return player && player.ships.length > 0;
    });
  }

  private createEmptyBoard(): number[][] {
    return Array(10).fill(null).map(() => Array(10).fill(0));
  }

  private placeShipsOnBoard(board: number[][], ships: Ship[]): void {
    ships.forEach(ship => {
      const { position, direction, length } = ship;
      
      for (let i = 0; i < length; i++) {
        const x = direction ? position.x : position.x + i;
        const y = direction ? position.y + i : position.y;
        
        if (x < 10 && y < 10) {
          board[y][x] = 1;
        }
      }
    });
  }

  private checkShipHit(ship: Ship, x: number, y: number): boolean {
    const { position, direction, length } = ship;
    
    for (let i = 0; i < length; i++) {
      const shipX = direction ? position.x : position.x + i;
      const shipY = direction ? position.y + i : position.y;
      
      if (shipX === x && shipY === y) {
        return true;
      }
    }
    
    return false;
  }

  isShipKilled(ship: Ship, attacks: Set<string>): boolean {
    const { position, direction, length } = ship;
    
    for (let i = 0; i < length; i++) {
      const x = direction ? position.x : position.x + i;
      const y = direction ? position.y + i : position.y;
      const attackKey = `${x},${y}`;
      
      if (!attacks.has(attackKey)) {
        return false;
      }
    }
    
    return true;
  }

  private markAroundShipAsMissed(ship: Ship, attacks: Set<string>): void {
    const { position, direction, length } = ship;
    
    for (let i = -1; i <= length; i++) {
      for (let j = -1; j <= 1; j++) {
        const x = direction ? position.x + j : position.x + i;
        const y = direction ? position.y + i : position.y + j;
        
        if (x >= 0 && x < 10 && y >= 0 && y < 10) {
          const attackKey = `${x},${y}`;
          if (!attacks.has(attackKey)) {
            attacks.add(attackKey);
          }
        }
      }
    }
  }
}