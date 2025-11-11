import { Game, Player, Room, Ship, WSRequest } from "../types";

export interface IPlayerService {
  registerPlayer(name: string, password: string, socket: WebSocket): Player;
  getPlayerByName(name: string): Player | undefined;
  getPlayerByIndex(index: number): Player | undefined;
  getPlayerBySocket(socket: WebSocket): Player | undefined;
  getAllPlayers(): Player[];
  removePlayer(playerIndex: number): void;
}

export interface IRoomService {
  createRoom(playerIndex: number): Room;
  addUserToRoom(roomId: number, playerIndex: number): void;
  removePlayerFromRooms(playerIndex: number): void;
  getAllRooms(): Room[];
  getRoomById(roomId: number): Room | undefined;
}

export interface IGameService {
  createGame(room: Room): Game;
  addShips(gameId: number, playerIndex: number, ships: Ship[]): void;
  attack(gameId: number, attackerIndex: number, x: number, y: number): void;
  randomAttack(gameId: number, attackerIndex: number): void;
  getGameById(gameId: number): Game | undefined;
  removeGame(gameId: number): void;
}

export interface IWinnerService {
  addWin(playerName: string): void;
  getWinners(): Array<{ name: string; wins: number }>;
}

export interface IMessageHandler {
  handleMessage(ws: WebSocket, message: WSRequest): void;
}

export interface INotificationService {
  updateRooms(): void;
  updateWinners(): void;
  sendToPlayer(playerIndex: number, message: any): void;
  broadcast(message: any): void;
}
