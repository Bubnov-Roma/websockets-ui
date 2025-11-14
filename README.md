# RSSchool NodeJS Battleship Game

> WebSocket-based Battleship game implementation for RS School NodeJS course.
> Includes static HTTP server and WebSocket game server.

## Assignment
This project implements the [Battleship Game assignment](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments/battleship/assignment.md) for the [RS School NodeJS course](https://rs.school/courses/nodejs).

## Architecture
- **HTTP Server**: Serves static files on port 8181
- **WebSocket Server**: Handles game logic on port 3000
- **TypeScript**: Full TypeScript implementation with CommonJS modules

## Installation
1. Clone/download repo
2. `npm install`

## Usage
**Development**

`npm run start:dev`

* WebSocket server @ `ws://localhost:3000`
* Static HTTP server @ `http://localhost:8181`
* Hot reload with nodemon

**Production**

`npm run start`

* WebSocket server @ `ws://localhost:3000` 
* Static HTTP server @ `http://localhost:8181`

**Build**

`npm run build`

* Compiles TypeScript to JavaScript in `/dist` directory

**Production Start**

`npm run start:prod`

* Runs compiled JavaScript from `/dist` directory

---

**All commands**

Command | Description
--- | ---
`npm run start:dev` | Development server with hot reload
`npm run start` | Production server without hot reload
`npm run build` | Compile TypeScript to JavaScript
`npm run start:prod` | Run compiled production version

## Game Features
- Player registration and authentication
- Room creation and management
- Ship placement and game setup
- Real-time turn-based battles
- Random attack functionality
- Winner tracking and game completion

## Technical Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **WebSocket**: ws library
- **HTTP**: Native http module
- **Build Tool**: TypeScript Compiler (tsc)

**Note**: replace `npm` with `yarn` in `package.json` if you use yarn.