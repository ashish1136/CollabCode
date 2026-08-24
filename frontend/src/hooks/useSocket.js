import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to backend server running on port 5000
    const s = io('http://localhost:5000');
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return socket;
};
