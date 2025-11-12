import { IWinnerService } from '../interfaces';

export class WinnerService implements IWinnerService {
  private winners: Map<string, number> = new Map();

  addWin(playerName: string): void {
    const currentWins = this.winners.get(playerName) || 0;
    this.winners.set(playerName, currentWins + 1);
  }

  getWinners(): Array<{ name: string; wins: number }> {
    return Array.from(this.winners.entries())
      .map(([name, wins]) => ({ name, wins }))
      .sort((a, b) => b.wins - a.wins);
  }
}