import React, { useState } from 'react';
import { Code2, LogOut, UserCheck } from 'lucide-react';

const Home = ({ user, onJoin, onLogout }) => {
  const [username, setUsername] = useState(user?.name || '');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    
    if (!username.trim() || !roomId.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roomId: roomId.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');

      onJoin(roomId.trim(), username.trim());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateRoom = async () => {
    setError('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:5000/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      setRoomId(data.roomId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        
        {/* User Account Bar */}
        <div className="flex items-center justify-between bg-gray-900 px-4 py-2.5 rounded-lg border border-gray-700 mb-6">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-emerald-400" />
            <div className="text-xs">
              <span className="text-white font-semibold">{user?.name}</span>
              <span className="text-gray-400 block font-mono text-[10px]">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-md transition-colors text-xs flex items-center gap-1 font-medium"
            title="Logout"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-blue-600/30">
            <Code2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CollabCode</h1>
          <p className="text-gray-400 mt-1 text-center text-sm">Real-time multiplayer coding & WebRTC workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2 font-medium">Display Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Satoshi"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 font-medium">Room ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room Code"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono uppercase"
                required
              />
              <button
                type="button"
                onClick={handleCreateRoom}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
              >
                Create Room
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 flex items-center justify-center gap-2 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-600/30 mt-4"
          >
            Enter Workspace
          </button>
        </form>
      </div>
    </div>
  );
};

export default Home;
