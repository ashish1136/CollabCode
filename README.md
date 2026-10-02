# 🚀 CollabCode
### AI-Powered Meeting Assistant & Real-Time Collaborative Platform

CollabCode is a real-time collaborative workspace designed for developers, students, and teams. It integrates collaborative coding, video conferencing, whiteboarding, live transcription, AI-powered meeting summaries, and code execution into a single platform.

---

## 📌 Features

### 👨‍💻 Real-Time Collaborative Coding
- Monaco Editor (VS Code Editor)
- Multi-user editing
- Live cursor synchronization
- Conflict-free collaboration using Yjs CRDTs

### 🎥 Video & Audio Conferencing
- WebRTC-based peer-to-peer communication
- Multi-participant meeting rooms
- Camera and microphone controls
- Low-latency real-time communication

### 📝 Live Shared Transcript
- Speech-to-text transcription
- Speaker identification
- Real-time transcript synchronization
- Shared meeting transcript across participants

### 🤖 AI Meeting Assistant
Generate:
- Meeting Summary
- Key Discussion Points
- Decisions Taken
- Action Items

Powered by:
- Groq API
- Large Language Models (LLMs)

### 🎨 Collaborative Whiteboard
- Real-time drawing
- Shared brainstorming space
- Instant synchronization

### ⚡ Multi-Language Code Execution
Supported Languages:
- JavaScript
- Python
- Java
- C++
- C

### 🔐 Authentication & Authorization
- JWT Authentication
- Protected Routes
- Password Hashing (bcrypt)
- Session Management

### 🗄️ Meeting History Storage
- MongoDB Integration
- AI Summary Persistence
- Meeting History Retrieval

---

# 🏗️ System Architecture

```text
                    ┌────────────────────┐
                    │   React Frontend   │
                    └─────────┬──────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │ Node.js + Express Server │
                └───────┬─────────┬────────┘
                        │         │
                        ▼         ▼
                  Socket.IO    MongoDB
                        │
                        ▼
                     WebRTC
                        │
                        ▼
                  Video / Audio

                        │
                        ▼
                 Transcript Engine
                        │
                        ▼
                    Groq API
                        │
                        ▼
                  AI Summary
```

---

# 🛠️ Tech Stack

## Frontend
- React.js
- TypeScript
- Tailwind CSS
- Monaco Editor
- Yjs
- Excalidraw
- Socket.IO Client

## Backend
- Node.js
- Express.js
- Socket.IO
- WebSocket (ws)
- JWT
- bcryptjs
- Groq SDK

## Database
- MongoDB
- Mongoose

## Real-Time Technologies
- WebRTC
- Socket.IO
- Yjs CRDT

---

# 📂 Project Structure

```text
CollabCode
│
├── frontend
│   ├── src
│   ├── components
│   ├── pages
│   ├── hooks
│   └── services
│
├── backend
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── socket
│   ├── utils
│   └── server.js
│
├── uploads
├── package.json
└── README.md
```

---

# 🔑 Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000

MONGO_URI=mongodb://localhost:27017/collabcode

JWT_SECRET=your_jwt_secret

GROQ_API_KEY=your_groq_api_key
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/CollabCode.git
```

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# 🔄 Workflow

## Video Calling

```text
User Joins Room
      ↓
Socket.IO Signaling
      ↓
WebRTC Offer
      ↓
WebRTC Answer
      ↓
ICE Candidate Exchange
      ↓
Peer-to-Peer Connection
```

## Collaborative Editor

```text
User Types
     ↓
Yjs CRDT
     ↓
WebSocket Sync
     ↓
All Users Receive Changes
```

## AI Meeting Summary

```text
Meeting Discussion
        ↓
Speech-to-Text
        ↓
Shared Transcript
        ↓
Groq API
        ↓
Summary Generation
        ↓
MongoDB Storage
```

---

# 📊 Database Collections

## Users

```json
{
  "_id": "...",
  "username": "Ashish",
  "email": "ashish@gmail.com",
  "password": "hashed_password"
}
```

## Meeting Summaries

```json
{
  "transcript": "...",
  "summary": "...",
  "keyPoints": [],
  "decisions": [],
  "actionItems": [],
  "createdAt": "..."
}
```

---

# 🔒 Security Features

- JWT Authentication
- Password Hashing using bcrypt
- Protected APIs
- Secure Environment Variables
- Room Participant Limits
- Server-side Validation

---

# 🎯 Future Enhancements

- Multi-language Speech Translation
- Cloud Recording
- Screen Sharing
- AI Code Review Assistant
- Jira/Trello Integration
- Meeting Analytics Dashboard
- Docker-Based Code Sandbox
- Role-Based Access Control

---

# 👨‍💻 Author

**Ashish Kumar Singh**  
B.E. Computer Science Engineering  
Chitkara University

---

# ⭐ Project Highlights

✅ Real-Time Collaborative Coding  
✅ WebRTC Video Conferencing  
✅ Shared Whiteboard  
✅ Live Meeting Transcript  
✅ AI-Powered Meeting Summary  
✅ Multi-Language Code Execution  
✅ JWT Authentication  
✅ MongoDB Persistence  

---

## 📄 License

This project is developed for academic and educational purposes.
