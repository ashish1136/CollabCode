import React, { useState } from 'react';
import Home from './components/Home';
import Room from './components/Room';

function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const handleJoin = (id, uName) => {
    setRoomId(id);
    setUsername(uName);
    setInRoom(true);
  };

  const handleLeave = () => {
    setInRoom(false);
    setRoomId('');
    setUsername('');
  };

  return (
    <div className="w-full h-screen flex text-gray-100 bg-gray-900 overflow-hidden font-sans">
      {inRoom ? (
        <Room roomId={roomId} username={username} onLeave={handleLeave} />
      ) : (
        <Home onJoin={handleJoin} />
      )}
    </div>
  );
}

export default App;
