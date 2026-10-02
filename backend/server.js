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
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Groq from 'groq-sdk';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'collabcode_secret_2026';

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collabcode';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.warn('MongoDB connection warning:', err.message));

// Minimal User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Mongoose Schema for AI Meeting Summary
const meetingSummarySchema = new mongoose.Schema({
  transcript: { type: String, required: true },
  summary: { type: String, required: true },
  keyPoints: [String],
  decisions: [String],
  actionItems: [String],
  createdAt: { type: Date, default: Date.now }
});

const MeetingSummary = mongoose.model('MeetingSummary', meetingSummarySchema);

const execPromise = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully', user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected Room Routes
app.post('/api/rooms/create', authMiddleware, (req, res) => {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  res.json({ roomId, message: 'Room created successfully' });
});

app.post('/api/rooms/join', authMiddleware, (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: 'Room ID is required' });
  res.json({ roomId, message: 'Joined room successfully' });
});

const server = http.createServer(app);

// Code Execution Endpoint for Terminal Editor
app.post('/execute', async (req, res) => {
  const { language, sourceCode, roomId, executedBy } = req.body;
  
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

    const finalOutput = output || 'Program executed successfully without output.';
    if (roomId && io) {
      io.to(roomId).emit('code-output', {
        output: finalOutput,
        language,
        executedBy: executedBy || 'Anonymous'
      });
    }

    res.json({ output: finalOutput });
  } catch (err) {
    let errorString = err.stderr || err.stdout || err.message;
    if (roomId && io) {
      io.to(roomId).emit('code-output', {
        output: errorString,
        language,
        executedBy: executedBy || 'Anonymous'
      });
    }
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

// Protected AI Meeting Summary Route using Google Gemini API and MongoDB
app.post('/api/meeting/summary', authMiddleware, async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'Meeting transcript is required.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return res.status(500).json({
      error: 'GROQ_API_KEY is not configured. Please add your key to backend/.env file.'
    });
  }

  try {
    const groq = new Groq({ apiKey });

    const prompt = `You are an AI meeting assistant.

Analyze the following meeting transcript and return:
1. Meeting Summary
2. Key Discussion Points
3. Decisions Taken
4. Action Items

Transcript:
${transcript}

Return the response strictly as a JSON object adhering to this schema:
{
  "summary": "Brief summary of the meeting",
  "keyPoints": ["Key point 1", "Key point 2"],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Action item 1", "Action item 2"]
}
Return ONLY valid JSON.`;
    console.log("USING MODEL:", "openai/gpt-oss-120b");
  const chatCompletion = await groq.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  model: 'openai/gpt-oss-120b',
  temperature: 0.2,
  response_format: { type: 'json_object' }
});

    const responseText = chatCompletion.choices[0]?.message?.content || '{}';

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    }

    const summaryPayload = {
      summary: parsedResult.summary || '',
      keyPoints: Array.isArray(parsedResult.keyPoints) ? parsedResult.keyPoints : [],
      decisions: Array.isArray(parsedResult.decisions) ? parsedResult.decisions : [],
      actionItems: Array.isArray(parsedResult.actionItems) ? parsedResult.actionItems : []
    };

    // Store the summary in MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        await MeetingSummary.create({
          transcript,
          ...summaryPayload
        });
      } else {
        console.warn('MongoDB not ready. Summary generated without database persistence.');
      }
    } catch (dbErr) {
      console.error('Failed to save meeting summary in MongoDB:', dbErr.message);
    }

    return res.json(summaryPayload);
  } catch (error) {
    console.error('Error generating meeting summary with Groq:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate meeting summary.'
    });
  }
});

// Protected View Meeting History Route
app.get('/api/meeting/history', authMiddleware, async (req, res) => {
  try {
    const summaries = await MeetingSummary.find().sort({ createdAt: -1 });
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    console.log(`[WebRTC Signaling] Relaying offer from ${socket.id} to ${data.to}`);
    io.to(data.to).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer,
    });
  });

  // WebRTC - Answer
  socket.on('webrtc-answer', (data) => {
    console.log(`[WebRTC Signaling] Relaying answer from ${socket.id} to ${data.to}`);
    io.to(data.to).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer,
    });
  });

  // WebRTC - ICE Candidate
  socket.on('webrtc-ice-candidate', (data) => {
    io.to(data.to).emit('webrtc-ice-candidate', {
      from: socket.id,
      candidate: data.candidate,
    });
  });

  // Whiteboard Real-Time Sync Relay
  socket.on('whiteboard-update', (data) => {
    socket.to(data.roomId).emit('whiteboard-update', data.elements);
  });

  // Transcript Real-Time Relay — broadcast each speaker's line to all other room members
  socket.on('transcript-update', ({ roomId, userName, text, timestamp }) => {
    if (!roomId || !text) return;
    socket.to(roomId).emit('transcript-update', { userName, text, timestamp });
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
