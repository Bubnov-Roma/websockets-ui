import { IRoomService } from '../interfaces';
import { Room } from '../types';

export class RoomService implements IRoomService {
  private rooms: Room[] = [];
  private roomIdCounter = 1;

  createRoom(playerIndex: number): Room {
    this.removePlayerFromRooms(playerIndex);
    
    const newRoom: Room = {
      roomId: this.roomIdCounter++,
      roomUsers: [{
        name: `Player${playerIndex}`,
        index: playerIndex
      }]
    };
    
    this.rooms.push(newRoom);
    return newRoom;
  }

  addUserToRoom(roomId: number, playerIndex: number): void {
    const room = this.rooms.find(r => r.roomId === roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    if (room.roomUsers.length >= 2) {
      throw new Error('Room is full');
    }
    
    room.roomUsers.push({
      name: `Player${playerIndex}`,
      index: playerIndex
    });
  }

  removePlayerFromRooms(playerIndex: number): void {
    for (let i = this.rooms.length - 1; i >= 0; i--) {
      const room = this.rooms[i];
      const userIndex = room.roomUsers.findIndex(user => user.index === playerIndex);
      
      if (userIndex > -1) {
        room.roomUsers.splice(userIndex, 1);
        
        if (room.roomUsers.length === 0) {
          this.rooms.splice(i, 1);
        }
      }
    }
  }

  getAllRooms(): Room[] {
    return this.rooms.map(room => ({
      roomId: room.roomId,
      roomUsers: [...room.roomUsers]
    }));
  }

  getRoomById(roomId: number): Room | undefined {
    return this.rooms.find(room => room.roomId === roomId);
  }

  removeRoom(roomId: number): void {
    const index = this.rooms.findIndex(room => room.roomId === roomId);
    if (index > -1) {
      this.rooms.splice(index, 1);
    }
  }
}