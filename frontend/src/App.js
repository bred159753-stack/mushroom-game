import React, { useState, useEffect, useRef } from 'react';
import { Hammer } from 'lucide-react';

const MushroomGame = () => {
  const [gameState, setGameState] = useState('menu');
  const [playerName, setPlayerName] = useState('');
  const [playerId] = useState(Math.random().toString(36).substr(2, 9));
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [mushrooms, setMushrooms] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const wsRef = useRef(null);

  // WebSocket 連線
  useEffect(() => {
    if (gameState === 'lobby' || gameState === 'playing') {
      // 本地測試用 ws://localhost:3001
      // 部署後改成你的伺服器網址，例如：wss://your-server.onrender.com
      wsRef.current = new WebSocket('ws://localhost:3001');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket 已連線');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'room_created':
            setRoomCode(data.roomCode);
            break;
          case 'players_update':
            setPlayers(data.players);
            break;
          case 'game_started':
            setGameState('playing');
            setTimeLeft(30);
            setScore(0);
            setMushrooms([]);
            break;
          case 'mushroom_spawn':
            setMushrooms(prev => [...prev, data.mushroom]);
            break;
          case 'score_update':
            setPlayers(data.players);
            const me = data.players.find(p => p.id === playerId);
            if (me) setScore(me.score);
            break;
          case 'error':
            alert(data.message);
            break;
        }
      };
      
      return () => {
        wsRef.current?.close();
      };
    }
  }, [gameState, playerId]);

  // 遊戲計時器
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      alert(`遊戲結束！你的分數：${score}`);
      setGameState('menu');
    }
  }, [gameState, timeLeft, score]);

  const createRoom = () => {
    wsRef.current?.send(JSON.stringify({
      type: 'create_room',
      playerId,
      playerName
    }));
    setGameState('lobby');
  };

  const joinRoom = () => {
    wsRef.current?.send(JSON.stringify({
      type: 'join_room',
      roomCode,
      playerId,
      playerName
    }));
    setGameState('lobby');
  };

  const startGame = () => {
    wsRef.current?.send(JSON.stringify({
      type: 'start_game',
      roomCode
    }));
  };

  const hitMushroom = (id, points) => {
    setMushrooms(prev => prev.filter(m => m.id !== id));
    wsRef.current?.send(JSON.stringify({
      type: 'hit_mushroom',
      roomCode,
      playerId,
      points
    }));
  };

  // 主選單畫面
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 text-green-700">🍄 打蘑菇大作戰</h1>
          <p className="text-center text-gray-600 mb-6">最多5人連線對戰</p>
          
          <input
            type="text"
            placeholder="輸入你的名字"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-green-500"
          />
          
          <button
            onClick={createRoom}
            disabled={!playerName.trim()}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold mb-3 hover:bg-green-700 disabled:bg-gray-300 transition"
          >
            創建房間
          </button>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="房間代碼"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            <button
              onClick={joinRoom}
              disabled={!playerName.trim() || !roomCode.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition"
            >
              加入
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 等待大廳畫面
  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <h2 className="text-3xl font-bold text-center mb-4 text-green-700">遊戲大廳</h2>
          
          <div className="bg-green-100 p-4 rounded-lg mb-6 text-center">
            <p className="text-sm text-gray-600 mb-1">分享此房間代碼給朋友：</p>
            <p className="text-4xl font-bold text-green-700 tracking-widest">{roomCode}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-gray-700">玩家 ({players.length}/5)</h3>
            <div className="space-y-2">
              {players.map((player, idx) => (
                <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" 
                       style={{ backgroundColor: `hsl(${idx * 70}, 70%, 60%)` }}>
                    {player.name[0]}
                  </div>
                  <span className="font-medium">{player.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={startGame}
            disabled={players.length < 1}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-300 transition"
          >
            {players.length < 1 ? '等待玩家...' : '開始遊戲！'}
          </button>
          
          <button
            onClick={() => setGameState('menu')}
            className="w-full mt-3 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // 遊戲進行中畫面
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-300 to-green-500 p-4">
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white rounded-lg shadow-lg p-4 flex justify-between items-center">
          <div className="flex gap-4 flex-wrap">
            {players.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" 
                     style={{ backgroundColor: `hsl(${idx * 70}, 70%, 60%)` }}>
                  {player.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold">{player.name}</div>
                  <div className="text-xs text-gray-600">{player.score} 分</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-3xl font-bold text-red-600">⏱️ {timeLeft}s</div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto bg-green-200 rounded-lg shadow-xl p-8 relative overflow-hidden" style={{ height: '500px' }}>
        {mushrooms.map(mushroom => (
          <button
            key={mushroom.id}
            onClick={() => hitMushroom(mushroom.id, mushroom.points)}
            className="absolute transition-transform hover:scale-125 active:scale-95 cursor-pointer"
            style={{
              left: `${mushroom.x}%`,
              top: `${mushroom.y}%`,
              fontSize: mushroom.points === 3 ? '60px' : mushroom.points === 2 ? '50px' : '40px'
            }}
          >
            🍄
          </button>
        ))}
        
        {mushrooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-green-700 text-2xl font-semibold opacity-50">
            <div className="text-center">
              <Hammer size={64} className="mx-auto mb-4" />
              <p>準備好你的錘子！</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="max-w-6xl mx-auto mt-4 text-center">
        <p className="text-white text-lg font-semibold drop-shadow-lg">你的分數: {score} 分</p>
      </div>
    </div>
  );
};

export default MushroomGame;