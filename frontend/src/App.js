import React, { useState, useEffect, useRef } from 'react';
import { Hammer, Users, Trophy, Clock } from 'lucide-react';

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

  // 顏色配置
  const playerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

  // WebSocket 連線
  useEffect(() => {
    if (gameState === 'lobby' || gameState === 'playing') {
      // 本地測試用
      // wsRef.current = new WebSocket('ws://localhost:3001');
      
      // 部署後用這個（記得替換成你的網址）
      wsRef.current = new WebSocket('wss://mushroom-game-backend.onrender.com');
      
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
          default:
            break;
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket 錯誤:', error);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket 已斷線');
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
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      const myRank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
      alert(`🎮 遊戲結束！\n\n你的排名：第 ${myRank} 名\n你的分數：${score} 分\n\n冠軍：${sortedPlayers[0]?.name} (${sortedPlayers[0]?.score} 分)`);
      setGameState('menu');
    }
  }, [gameState, timeLeft, score, players, playerId]);

  const createRoom = () => {
    if (!playerName.trim()) return;
    wsRef.current?.send(JSON.stringify({
      type: 'create_room',
      playerId,
      playerName: playerName.trim()
    }));
    setGameState('lobby');
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    wsRef.current?.send(JSON.stringify({
      type: 'join_room',
      roomCode: roomCode.trim(),
      playerId,
      playerName: playerName.trim()
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

  // 蘑菇組件
  const Mushroom = ({ size, onClick, style }) => {
    const colors = {
      small: { cap: '#E74C3C', spots: '#FFFFFF' },
      medium: { cap: '#E67E22', spots: '#FFFFFF' },
      large: { cap: '#F39C12', spots: '#FFFFFF' }
    };
    
    const color = colors[size];
    const scale = size === 'large' ? 1.5 : size === 'medium' ? 1.2 : 1;
    
    return (
      <button
        onClick={onClick}
        className="absolute transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        style={{
          ...style,
          transform: `scale(${scale})`,
          zIndex: 10
        }}
      >
        <svg width="50" height="50" viewBox="0 0 50 50">
          {/* 蘑菇柄 */}
          <rect x="20" y="25" width="10" height="20" fill="#F5E6D3" rx="2" />
          {/* 蘑菇傘 */}
          <ellipse cx="25" cy="25" rx="18" ry="15" fill={color.cap} />
          {/* 白點 */}
          <circle cx="18" cy="22" r="3" fill={color.spots} opacity="0.9" />
          <circle cx="28" cy="20" r="2.5" fill={color.spots} opacity="0.9" />
          <circle cx="25" cy="28" r="2" fill={color.spots} opacity="0.9" />
          <circle cx="32" cy="25" r="2" fill={color.spots} opacity="0.9" />
        </svg>
      </button>
    );
  };

  // 主選單畫面
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block mb-4">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <ellipse cx="50" cy="45" rx="35" ry="30" fill="#E74C3C" />
                <circle cx="38" cy="38" r="6" fill="white" opacity="0.9" />
                <circle cx="55" cy="35" r="5" fill="white" opacity="0.9" />
                <circle cx="50" cy="52" r="4" fill="white" opacity="0.9" />
                <circle cx="65" cy="45" r="4" fill="white" opacity="0.9" />
                <rect x="40" y="50" width="20" height="40" fill="#F5E6D3" rx="4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-emerald-700 mb-2">打蘑菇大作戰</h1>
            <p className="text-gray-600 flex items-center justify-center gap-2">
              <Users size={18} />
              最多5人連線對戰
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">你的名字</label>
              <input
                type="text"
                placeholder="輸入你的暱稱"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                maxLength={12}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            
            <button
              onClick={createRoom}
              disabled={!playerName.trim()}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
            >
              創建房間
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">加入房間</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="輸入房間代碼"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                  maxLength={6}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition uppercase"
                />
                <button
                  onClick={joinRoom}
                  disabled={!playerName.trim() || !roomCode.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg"
                >
                  加入
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl">
            <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
              <Trophy size={18} />
              遊戲規則
            </h3>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li>• 遊戲時間：30 秒</li>
              <li>• 小蘑菇 = 1分，中蘑菇 = 2分，大蘑菇 = 3分</li>
              <li>• 點擊蘑菇獲得分數</li>
              <li>• 分數最高的玩家獲勝！</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 等待大廳畫面
  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
          <h2 className="text-3xl font-bold text-center mb-6 text-emerald-700">遊戲大廳</h2>
          
          <div className="bg-gradient-to-r from-emerald-100 to-teal-100 p-6 rounded-2xl mb-6 text-center border-2 border-emerald-300">
            <p className="text-sm text-gray-600 mb-2 font-medium">分享此房間代碼給朋友：</p>
            <p className="text-5xl font-bold text-emerald-700 tracking-widest mb-2">{roomCode}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomCode);
                alert('房間代碼已複製！');
              }}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
            >
              複製代碼
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <Users size={20} />
              玩家列表 ({players.length}/5)
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {players.map((player, idx) => (
                <div key={player.id} className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md" 
                    style={{ backgroundColor: playerColors[idx % playerColors.length] }}
                  >
                    {player.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-gray-800">{player.name}</span>
                    {player.id === playerId && (
                      <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">你</span>
                    )}
                  </div>
                  {idx === 0 && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">房主</span>
                  )}
                </div>
              ))}
              {players.length < 5 && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users size={24} className="text-gray-400" />
                  </div>
                  <span className="text-gray-400 font-medium">等待玩家加入...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={startGame}
              disabled={players.length < 1}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
            >
              {players.length < 1 ? '等待玩家...' : '開始遊戲！'}
            </button>
            
            <button
              onClick={() => {
                wsRef.current?.close();
                setGameState('menu');
              }}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              離開房間
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 遊戲進行中畫面
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-300 via-emerald-400 to-teal-500 p-4">
      {/* 頂部分數欄 */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white rounded-2xl shadow-xl p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-3 flex-wrap">
              {players.sort((a, b) => b.score - a.score).map((player, idx) => (
                <div key={player.id} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md" 
                    style={{ backgroundColor: playerColors[players.findIndex(p => p.id === player.id) % playerColors.length] }}
                  >
                    {player.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      {player.name}
                      {player.id === playerId && <span className="text-emerald-600">(你)</span>}
                    </div>
                    <div className="text-lg font-bold text-emerald-600">{player.score} 分</div>
                  </div>
                  {idx === 0 && <Trophy size={18} className="text-yellow-500" />}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-6 py-3 rounded-xl border-2 border-red-200">
              <Clock size={28} className="text-red-600" />
              <span className="text-4xl font-bold text-red-600">{timeLeft}s</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 遊戲區域 */}
      <div className="max-w-6xl mx-auto bg-gradient-to-br from-green-200 to-emerald-300 rounded-2xl shadow-2xl p-8 relative overflow-hidden border-4 border-green-400" style={{ height: '500px' }}>
        {/* 草地裝飾 */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-green-600 to-transparent opacity-30"></div>
        
        {mushrooms.map(mushroom => (
          <Mushroom
            key={mushroom.id}
            size={mushroom.points === 3 ? 'large' : mushroom.points === 2 ? 'medium' : 'small'}
            onClick={() => hitMushroom(mushroom.id, mushroom.points)}
            style={{
              left: `${mushroom.x}%`,
              top: `${mushroom.y}%`,
            }}
          />
        ))}
        
        {mushrooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-green-700 opacity-60">
            <div className="text-center">
              <Hammer size={64} className="mx-auto mb-4" />
              <p className="text-2xl font-bold">準備好你的錘子！</p>
              <p className="text-lg mt-2">蘑菇即將出現...</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="max-w-6xl mx-auto mt-4">
        <div className="bg-white bg-opacity-90 rounded-xl p-4 text-center shadow-lg">
          <p className="text-2xl font-bold text-emerald-700">你的分數: {score} 分</p>
          <p className="text-sm text-gray-600 mt-1">繼續加油！</p>
        </div>
      </div>
    </div>
  );
};

export default MushroomGame;