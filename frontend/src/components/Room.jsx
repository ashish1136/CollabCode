import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import Editor from './Editor';
import Whiteboard from './Whiteboard';
import UsersList from './UsersList';
import VideoCall from './VideoCall';
import { useSocket } from '../hooks/useSocket';

const Room = ({ roomId, username, onLeave }) => {
  const socket = useSocket();
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('code');

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', { roomId, username });

    socket.on('room-users', (usersList) => {
      setUsers(usersList);
    });

    socket.on('user-joined', (user) => {
      setUsers((prev) => [...prev.filter(u => u.id !== user.id), user]);
    });

    socket.on('user-left', (userId) => {
      setUsers((prev) => prev.filter(u => u.id !== userId));
    });

    socket.on('room-full', ({ message }) => {
      alert(message || 'Room is full! Maximum 5 participants allowed per room.');
      onLeave();
    });

    return () => {
      socket.emit('leave-room');
      socket.off('room-users');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('room-full');
    };
  }, [socket, roomId, username, onLeave]);

  const handleLeaveClick = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    onLeave();
  };

  return (
    <div className="flex w-full h-full bg-gray-900 border-t border-gray-800">
      {/* Sidebar: Users list & WebRTC video call (Max 5 participants indicator) */}
      <div className="w-80 flex flex-col bg-[#141414] border-r border-gray-800 shadow-xl overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-800/80 flex justify-between items-center bg-[#1a1a1a]">
          <div>
            <h2 className="font-bold text-gray-200 truncate pr-2 tracking-wide font-mono text-sm">
              Room: <span className="text-blue-400">{roomId}</span>
            </h2>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Capacity: <span className="text-emerald-400 font-bold">{users.length}/5</span> Users
            </p>
          </div>
          <button 
            onClick={handleLeaveClick}
            className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors flex items-center justify-center shrink-0"
            title="Leave Room"
          >
            <LogOut size={16} />
          </button>
        </div>
        
        {socket ? (
          <div className="flex-1 overflow-hidden flex flex-col custom-scrollbar">
            <UsersList users={users} currentUser={socket.id} />
            <div className="w-full h-[1px] bg-gray-800 my-1"></div>
            <VideoCall socket={socket} users={users} />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 font-mono text-sm">Connecting socket...</div>
        )}
      </div>

      {/* Main Workspace Container with Terminal Editor and Whiteboard Tabs */}
      <div className="flex-1 flex flex-col bg-[#0d0d0d] relative overflow-hidden">
        {/* Workspace Tabs */}
        <div className="flex bg-[#1a1a1a] border-b border-gray-800">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'code'
                ? 'bg-[#0d0d0d] text-blue-400 border-t-2 border-t-blue-500 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 border-t-2 border-t-transparent'
            }`}
          >
            Terminal Editor
          </button>
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'whiteboard'
                ? 'bg-[#0d0d0d] text-blue-400 border-t-2 border-t-blue-500 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 border-t-2 border-t-transparent'
            }`}
          >
            Whiteboard
          </button>
        </div>

        {/* Panes rendered simultaneously but toggled via visibility to preserve state */}
        <div className="flex-1 relative">
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${
              activeTab === 'code' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <Editor roomId={roomId} />
          </div>
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${
              activeTab === 'whiteboard' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            {socket && <Whiteboard socket={socket} roomId={roomId} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
