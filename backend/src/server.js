const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 儲存所有房間
const rooms = new Map();

// 生成房間代碼
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws) => {
  console.log('新玩家連線');
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch(data.type) {
      case 'create_room':
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
          players: [{ id: data.playerId, name: data.playerName, ws, score: 0 }],
          gameState: 'lobby',
          mushrooms: []
        });
        ws.send(JSON.stringify({ type: 'room_created', roomCode }));
        break;
        
      case 'join_room':
        const room = rooms.get(data.roomCode);
        if (room && room.players.length < 5) {
          room.players.push({ id: data.playerId, name: data.playerName, ws, score: 0 });
          
          // 通知房間內所有玩家
          room.players.forEach(player => {
            player.ws.send(JSON.stringify({
              type: 'players_update',
              players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
            }));
          });
        } else {
          ws.send(JSON.stringify({ type: 'error', message: '房間已滿或不存在' }));
        }
        break;
        
      case 'start_game':
        const gameRoom = rooms.get(data.roomCode);
        if (gameRoom) {
          gameRoom.gameState = 'playing';
          gameRoom.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'game_started' }));
          });
          
          // 開始生成蘑菇
          startMushroomSpawner(data.roomCode);
        }
        break;
        
      case 'hit_mushroom':
        const hitRoom = rooms.get(data.roomCode);
        if (hitRoom) {
          const player = hitRoom.players.find(p => p.id === data.playerId);
          if (player) {
            player.score += data.points;
            
            // 廣播分數更新
            hitRoom.players.forEach(p => {
              p.ws.send(JSON.stringify({
                type: 'score_update',
                players: hitRoom.players.map(pl => ({ id: pl.id, name: pl.name, score: pl.score }))
              }));
            });
          }
        }
        break;
    }
  });
  
  ws.on('close', () => {
    console.log('玩家離線');
    // 清理斷線玩家
    rooms.forEach((room, code) => {
      room.players = room.players.filter(p => p.ws !== ws);
      if (room.players.length === 0) {
        rooms.delete(code);
      }
    });
  });
});

// 蘑菇生成器
function startMushroomSpawner(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const interval = setInterval(() => {
    if (room.gameState !== 'playing') {
      clearInterval(interval);
      return;
    }
    
    const mushroom = {
      id: Date.now(),
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
      points: Math.floor(Math.random() * 3) + 1
    };
    
    room.players.forEach(player => {
      player.ws.send(JSON.stringify({ type: 'mushroom_spawn', mushroom }));
    });
  }, 1500);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🍄 伺服器運行在 http://localhost:${PORT}`);
});