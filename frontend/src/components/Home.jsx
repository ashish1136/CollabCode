import React, { useState } from 'react';
import { Code2 } from 'lucide-react';

const Home = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      onJoin(roomId.trim(), username.trim());
    }
  };

  const generateRoomId = () => {
    setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <Code2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CollabCode</h1>
          <p className="text-gray-400 mt-2 text-center text-sm">Real-time multiplayer coding & WebRTC workspace</p>
        </div>

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
                onClick={generateRoomId}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
              >
                Generate
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
