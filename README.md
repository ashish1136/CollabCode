<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CollabCode - Project Documentation</title>
</head>
<body>

    <h1 align="center">🚀 CollabCode</h1>
    <h3 align="center">AI-Powered Meeting Assistant & Real-Time Collaborative Platform</h3>

    <hr>

    <h2>📖 Overview</h2>
    <p>
        CollabCode is a MERN-stack based real-time collaboration platform designed
        for developers, students, and teams. The platform integrates video conferencing,
        collaborative coding, whiteboarding, code execution, live transcription,
        and AI-powered meeting summaries into a single workspace.
    </p>

    <hr>

    <h2>✨ Features</h2>

    <h3>👥 Real-Time Collaboration</h3>
    <ul>
        <li>Multi-user collaborative coding</li>
        <li>Live cursor synchronization</li>
        <li>Conflict-free editing using Yjs CRDTs</li>
        <li>Real-time document updates</li>
    </ul>

    <h3>💻 Collaborative Code Editor</h3>
    <ul>
        <li>Monaco Editor (VS Code Editor)</li>
        <li>Syntax Highlighting</li>
        <li>Multi-language support</li>
        <li>Real-time synchronization</li>
    </ul>

    <h3>🎥 Video & Audio Conferencing</h3>
    <ul>
        <li>WebRTC-based communication</li>
        <li>Multi-participant rooms</li>
        <li>Low-latency audio/video calls</li>
        <li>Camera and microphone controls</li>
    </ul>

    <h3>📝 Live Meeting Transcript</h3>
    <ul>
        <li>Speech-to-text transcription</li>
        <li>Shared transcript across participants</li>
        <li>Speaker identification</li>
        <li>Real-time synchronization</li>
    </ul>

    <h3>🤖 AI Meeting Assistant</h3>
    <ul>
        <li>Meeting Summary Generation</li>
        <li>Key Discussion Points</li>
        <li>Decision Extraction</li>
        <li>Action Item Detection</li>
    </ul>

    <h3>🎨 Collaborative Whiteboard</h3>
    <ul>
        <li>Real-time drawing</li>
        <li>Shared brainstorming workspace</li>
        <li>Instant synchronization</li>
    </ul>

    <h3>⚡ Multi-Language Code Execution</h3>
    <ul>
        <li>JavaScript</li>
        <li>Python</li>
        <li>Java</li>
        <li>C++</li>
        <li>C</li>
    </ul>

    <h3>🔐 Authentication & Authorization</h3>
    <ul>
        <li>JWT Authentication</li>
        <li>Protected Routes</li>
        <li>Password Hashing using bcrypt</li>
        <li>User Session Management</li>
    </ul>

    <hr>

    <h2>🏗️ System Architecture</h2>

<pre>
Frontend (React + TypeScript)
            │
            ▼
Node.js + Express Backend
            │
 ┌──────────┼─────────────┐
 │          │             │
 ▼          ▼             ▼
Socket.IO  WebRTC      MongoDB
 │                        │
 ▼                        ▼
Real-Time Sync      Meeting Storage
            │
            ▼
        Groq AI
            │
            ▼
Meeting Summary Generation
</pre>

    <hr>

    <h2>🛠️ Technology Stack</h2>

    <h3>Frontend</h3>
    <ul>
        <li>React.js</li>
        <li>TypeScript</li>
        <li>Tailwind CSS</li>
        <li>Monaco Editor</li>
        <li>Yjs</li>
        <li>Excalidraw</li>
        <li>Socket.IO Client</li>
    </ul>

    <h3>Backend</h3>
    <ul>
        <li>Node.js</li>
        <li>Express.js</li>
        <li>Socket.IO</li>
        <li>WebSocket (ws)</li>
        <li>JWT</li>
        <li>bcryptjs</li>
        <li>Groq SDK</li>
    </ul>

    <h3>Database</h3>
    <ul>
        <li>MongoDB</li>
        <li>Mongoose</li>
    </ul>

    <hr>

    <h2>📂 Project Structure</h2>

<pre>
CollabCode/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── services/
│
├── backend/
│   ├── models/
│   ├── middleware/
│   ├── routes/
│   ├── socket/
│   ├── utils/
│   └── server.js
│
├── uploads/
├── package.json
└── README.html
</pre>

    <hr>

    <h2>🔑 Environment Variables</h2>

<pre>
PORT=5000

MONGO_URI=mongodb://localhost:27017/collabcode

JWT_SECRET=your_jwt_secret

GROQ_API_KEY=your_groq_api_key
</pre>

    <hr>

    <h2>⚙️ Installation</h2>

    <h3>Clone Repository</h3>

<pre>
git clone https://github.com/yourusername/CollabCode.git
</pre>

    <h3>Backend Setup</h3>

<pre>
cd backend
npm install
npm run dev
</pre>

    <h3>Frontend Setup</h3>

<pre>
cd frontend
npm install
npm run dev
</pre>

    <hr>

    <h2>📊 Database Collections</h2>

    <h3>Users</h3>

<pre>
{
  _id,
  username,
  email,
  password,
  createdAt
}
</pre>

    <h3>Meeting Summaries</h3>

<pre>
{
  transcript,
  summary,
  keyPoints,
  decisions,
  actionItems,
  createdAt
}
</pre>

    <hr>

    <h2>🔄 Workflow</h2>

    <h3>Video Calling</h3>

<pre>
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
Peer-to-Peer Video Call
</pre>

    <h3>Collaborative Editor</h3>

<pre>
User Types
     ↓
Yjs CRDT
     ↓
WebSocket Sync
     ↓
All Users Receive Changes
</pre>

    <h3>AI Meeting Summary</h3>

<pre>
Meeting Discussion
        ↓
Speech-to-Text
        ↓
Shared Transcript
        ↓
Groq AI
        ↓
Summary + Key Points
        ↓
MongoDB Storage
</pre>

    <hr>

    <h2>🔒 Security Features</h2>

    <ul>
        <li>JWT Authentication</li>
        <li>Password Hashing with bcrypt</li>
        <li>Protected Routes</li>
        <li>Secure Environment Variables</li>
        <li>Participant Limits</li>
        <li>Server-side Validation</li>
    </ul>

    <hr>

    <h2>🎯 Future Enhancements</h2>

    <ul>
        <li>Multi-language speech translation</li>
        <li>Cloud recording</li>
        <li>Screen sharing</li>
        <li>AI code review assistant</li>
        <li>Jira/Trello integration</li>
        <li>Meeting analytics dashboard</li>
        <li>Docker-based code sandbox</li>
        <li>Role-based access control</li>
    </ul>

    <hr>

    <h2>👨‍💻 Author</h2>

    <p>
        <strong>Ashish Kumar Singh</strong><br>
        B.E. Computer Science Engineering<br>
        Chitkara University
    </p>

    <hr>

    <h2>📄 License</h2>

    <p>
        This project is developed for academic and educational purposes.
    </p>

    <hr>

    <h2>⭐ Project Summary</h2>

    <p>
        CollabCode is a unified developer collaboration platform that combines
        real-time code editing, WebRTC-based video conferencing, collaborative
        whiteboarding, code execution, speech transcription, and AI-powered
        meeting summarization into a single application. The platform leverages
        React, Node.js, Socket.IO, Yjs, MongoDB, WebRTC, and Groq AI to provide
        an efficient and intelligent collaborative environment.
    </p>

</body>
</html>
