import { IPlayerService } from '../interfaces';
import { Player } from '../types';

export class PlayerService implements IPlayerService {
  private players: Map<string, Player> = new Map();
  private playersByIndex: Map<number, Player> = new Map();
  private playerIndexCounter = 1;

  registerPlayer(name: string, password: string, socket: WebSocket): Player {
    const existingPlayer = this.players.get(name);
    
    if (existingPlayer) {
      if (existingPlayer.password !== password) {
        throw new Error('Invalid password');
      }
      existingPlayer.socket = socket;
      return existingPlayer;
    }
    
    const newPlayer: Player = {
      name,
      password,
      index: this.playerIndexCounter++,
      wins: 0,
      socket
    };
    
    this.players.set(name, newPlayer);
    this.playersByIndex.set(newPlayer.index, newPlayer);
    
    return newPlayer;
  }

  getPlayerByName(name: string): Player | undefined {
    return this.players.get(name);
  }

  getPlayerByIndex(index: number): Player | undefined {
    return this.playersByIndex.get(index);
  }

  getPlayerBySocket(socket: WebSocket): Player | undefined {
    return Array.from(this.players.values()).find(p => p.socket === socket);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  removePlayer(playerIndex: number): void {
    const player = this.playersByIndex.get(playerIndex);
    if (player) {
      this.players.delete(player.name);
      this.playersByIndex.delete(playerIndex);
    }
  }

  addWin(playerIndex: number): void {
    const player = this.playersByIndex.get(playerIndex);
    if (player) {
      player.wins++;
    }
  }
}