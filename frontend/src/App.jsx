import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Room from './components/Room';
import Auth from './components/Auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setInRoom(false);
    setRoomId('');
    setUsername('');
  };

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

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white font-mono text-sm">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex text-gray-100 bg-gray-900 overflow-hidden font-sans">
      {!user ? (
        <Auth onAuthSuccess={(userData) => setUser(userData)} />
      ) : inRoom ? (
        <Room roomId={roomId} username={username} onLeave={handleLeave} />
      ) : (
        <Home user={user} onJoin={handleJoin} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
