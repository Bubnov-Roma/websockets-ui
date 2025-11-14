import { WebSocket } from 'ws';
// Registrations
export type RegRequest = {
  readonly type: 'reg';
  readonly data: {
    name: string;
    password: string;
  };
  readonly id: 0;
}

export type RegResponse = {
  readonly type: 'reg';
  readonly data: {
    name: string;
    index: number;
    error: boolean;
    errorText: string;
  };
  readonly id: 0;
}

// Rooms 
export type CreateRoomRequest = {
  readonly type: 'create_room';
  readonly data: '';
  readonly id: 0;
}

export type AddUserToRoomRequest = {
  readonly type: 'add_user_to_room';
  readonly data: {
    indexRoom: number;
  }
  readonly id: 0;
}

export type CreateGameResponse = {
  readonly type: 'create_game';
  readonly data: {
    idGame: number;
    idPlayer: number;
  }
  readonly id: 0;
}

export type UpdateRoomResponse = {
  readonly type: 'update_room';
  readonly data: Array<{
    readonly roomId: number;
    readonly roomUsers: Array<{
      name: string;
      index: number;
    }>;
  }>;
  readonly id: 0;
}

export type SinglePlayRequest = {
  readonly type: 'single_play';
  readonly data: '';
  readonly id: 0;
}


// Ships
export type Ship = {
  readonly position: {
    x: number;
    y: number;
  }
  readonly direction: boolean;
  readonly length: number;
  readonly type: 'small' | 'medium' | 'large' | 'huge';
}

export type AddShipsRequest = {
  readonly type: 'add_ships';
  readonly data: {
    gameId: number;
    ships: Ship[];
    indexPlayer: number;
  };
  readonly id: 0;
}

export type StartGameResponse = {
  readonly type: 'start_game';
  readonly data: {
    ships: Ship[];
    currentPlayerIndex: number;
  };
  readonly id: 0;
}

// Game 
export type AttackRequest = {
  readonly type: 'attack';
  readonly data: {
    readonly gameId: number;
      x: number;
      y: number;
      indexPlayer: number;
  };
  readonly id: 0;
}

export type RandomAttackRequest = {
  readonly type: 'randomAttack';
  readonly data: {
    readonly gameId: number;
    x: number;
    y: number;
    indexPlayer: number;
  };
  readonly id: 0;
}

export type AttackResponse = {
  readonly type: 'attack';
  readonly data: {
    readonly position: {
      x: number;
      y: number;
    };
    readonly currentPlayer: number;
    readonly status: 'miss' | 'killed' | 'shot';
  };
  readonly id: 0;
}

export type TurnResponse = {
  readonly type: 'turn';
  readonly data: {
    currentPlayer: number;
  };
  readonly id: 0;
}

export type FinishResponse = {
  readonly type: 'finish';
  readonly data: {
    winPlayer: number;
  };
  readonly id: 0;
}

// Winners
export type UpdateWinnersResponse = {
  readonly type: 'update_winners';
  readonly data: Array<{
    name: string;
    wins: number;
  }>;
  readonly id: 0;
}

// WS 
export type WSMessage = {
  readonly type: string;
  readonly data: string;
  readonly id: number;
}

export type WSRequest = 
  | RegRequest
  | CreateRoomRequest
  | AddUserToRoomRequest
  | AddShipsRequest
  | AttackRequest
  | RandomAttackRequest
  | SinglePlayRequest;

export type WSResponse =
  | RegResponse
  | CreateGameResponse
  | UpdateRoomResponse
  | StartGameResponse
  | AttackResponse
  | TurnResponse
  | FinishResponse
  | UpdateWinnersResponse;

// Data models
export type Player = {
  readonly name: string;
  readonly password: string;
  readonly index: number;
  wins: number;
  socket: WebSocket;
}

export type RoomUser = {
  readonly name: string;
  readonly index: number;
}

export type Room = {
  readonly roomId: number;
  readonly roomUsers: RoomUser[];
}

export type GamePlayer = {
  readonly socket: WebSocket;
  ships: Ship[];
  readonly board: number[][];
  readonly attacks: Set<string>;
}

export type Game = {
  readonly idGame: number;
  readonly players: Map<number, GamePlayer>;
  currentPlayer: number;
  readonly playerIds: number[];
}