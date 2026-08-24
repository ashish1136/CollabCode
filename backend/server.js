import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import yWebsocketUtils from 'y-websocket/bin/utils';
const setupWSConnection = yWebsocketUtils.setupWSConnection;
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execPromise = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Code Execution Endpoint for Terminal Editor
app.post('/execute', async (req, res) => {
  const { language, sourceCode } = req.body;
  
  if (!language || !sourceCode) {
    return res.status(400).json({ error: 'Language and source code are required' });
  }

  const fileId = crypto.randomBytes(8).toString('hex');
  const tempDir = path.join(process.cwd(), 'temp_exec');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    let output = '';
    
    if (language === 'javascript') {
      const filePath = path.join(tempDir, `${fileId}.js`);
      fs.writeFileSync(filePath, sourceCode);
      const { stdout, stderr } = await execPromise(`node ${filePath}`, { timeout: 5000 });
      output = stdout || stderr;
    } 
    else if (language === 'python') {
      const filePath = path.join(tempDir, `${fileId}.py`);
      fs.writeFileSync(filePath, sourceCode);
      const { stdout, stderr } = await execPromise(`python ${filePath}`, { timeout: 5000 });
      output = stdout || stderr;
    }
    else if (language === 'cpp') {
      const filePath = path.join(tempDir, `${fileId}.cpp`);
      const outPath = path.join(tempDir, `${fileId}.exe`);
      fs.writeFileSync(filePath, sourceCode);
      await execPromise(`g++ ${filePath} -o ${outPath}`, { timeout: 5000 });
      const { stdout, stderr } = await execPromise(`${outPath}`, { timeout: 5000 });
      output = stdout || stderr;
    }
    else if (language === 'c') {
      const filePath = path.join(tempDir, `${fileId}.c`);
      const outPath = path.join(tempDir, `${fileId}.exe`);
      fs.writeFileSync(filePath, sourceCode);
      await execPromise(`gcc ${filePath} -o ${outPath}`, { timeout: 5000 });
      const { stdout, stderr } = await execPromise(`${outPath}`, { timeout: 5000 });
      output = stdout || stderr;
    }
    else if (language === 'java') {
      const filePath = path.join(tempDir, `Main_${fileId}.java`);
      const modifiedCode = sourceCode.replace(/public\s+class\s+([A-Za-z0-9_]+)/, `public class Main_${fileId}`);
      fs.writeFileSync(filePath, modifiedCode);
      
      await execPromise(`javac ${filePath}`, { timeout: 5000 });
      const { stdout, stderr } = await execPromise(`java -cp ${tempDir} Main_${fileId}`, { timeout: 5000 });
      output = stdout || stderr;
    }
    else {
      return res.status(400).json({ error: 'Language not supported locally.' });
    }

    res.json({ output: output || 'Program executed successfully without output.' });
  } catch (err) {
    let errorString = err.stderr || err.stdout || err.message;
    res.status(200).json({ error: errorString });
  } finally {
    setTimeout(() => {
      try {
        fs.readdirSync(tempDir).forEach(file => {
           if (file.includes(fileId)) {
             fs.unlinkSync(path.join(tempDir, file));
           }
        });
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    }, 100);
  }
});

// Setup Socket.IO for WebRTC Signaling, Presence, and Whiteboard
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const roomUsers = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user joins a room (Max 5 participants limit enforced)
  socket.on('join-room', ({ roomId, username }) => {
    // Check if room has reached maximum limit of 5 participants
    if (roomUsers[roomId] && roomUsers[roomId].length >= 5 && !roomUsers[roomId].some(u => u.id === socket.id)) {
      socket.emit('room-full', { message: 'Room is full! Maximum 5 participants allowed per room.' });
      return;
    }

    socket.join(roomId);
    
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }
    
    const existingUser = roomUsers[roomId].find(u => u.id === socket.id);
    if (!existingUser) {
      const user = { id: socket.id, username };
      roomUsers[roomId].push(user);
      
      socket.roomId = roomId;

      socket.to(roomId).emit('user-joined', user);
      socket.emit('room-users', roomUsers[roomId]);
    }
  });

  // WebRTC - Offer
  socket.on('webrtc-offer', (data) => {
    socket.to(data.to).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer,
    });
  });

  // WebRTC - Answer
  socket.on('webrtc-answer', (data) => {
    socket.to(data.to).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer,
    });
  });

  // WebRTC - ICE Candidate
  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.to).emit('webrtc-ice-candidate', {
      from: socket.id,
      candidate: data.candidate,
    });
  });

  // Whiteboard Real-Time Sync Relay
  socket.on('whiteboard-update', (data) => {
    socket.to(data.roomId).emit('whiteboard-update', data.elements);
  });

  const handleLeaveRoom = () => {
    const roomId = socket.roomId;
    if (roomId && roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socket.id);
      socket.to(roomId).emit('user-left', socket.id);
      
      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
      socket.leave(roomId);
      socket.roomId = null;
    }
  };

  socket.on('leave-room', () => {
    handleLeaveRoom();
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    handleLeaveRoom();
  });
});

// Setup Yjs WebSocket Server for Collaborative Editing
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
});

server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
