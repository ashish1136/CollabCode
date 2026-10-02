import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LogOut, BrainCircuit, FileText, X } from 'lucide-react';
import Editor from './Editor';
import Whiteboard from './Whiteboard';
import UsersList from './UsersList';
import VideoCall from './VideoCall';
import MeetingSummary from './MeetingSummary';
import { useSocket } from '../hooks/useSocket';

const Room = ({ roomId, username, onLeave }) => {
  const socket = useSocket();
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('code');
  const [showSummary, setShowSummary] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  // sharedTranscript = combined transcript from ALL participants via socket
  const [sharedTranscript, setSharedTranscript] = useState('');
  const [transcript, setTranscript] = useState('');
  const [transcriptMeta, setTranscriptMeta] = useState({
    interimText: '',
    isListening: false,
    isSupported: true,
  });
  const transcriptRef = useRef('');
  const sharedTranscriptRef = useRef('');

  // Keep ref in sync so handleLeaveClick can read latest without stale closure
  const handleTranscriptUpdate = useCallback((newTranscript, meta) => {
    transcriptRef.current = newTranscript;
    setTranscript(newTranscript);
    if (meta) {
      setTranscriptMeta(meta);
    }
  }, []);

  // Emit each new local transcript line to all room participants
  const lastEmittedLengthRef = useRef(0);
  useEffect(() => {
    if (!socket || !transcript) return;
    // Only emit lines that are new since the last emit
    const lines = transcript.split('\n').filter(Boolean);
    const newLines = lines.slice(lastEmittedLengthRef.current);
    if (newLines.length === 0) return;
    lastEmittedLengthRef.current = lines.length;
    newLines.forEach((line) => {
      socket.emit('transcript-update', {
        roomId,
        userName: username,
        text: line,
        timestamp: new Date().toISOString(),
      });
    });
  }, [transcript, socket, roomId, username]);

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

    // Receive transcript entries from ALL participants (including self echo is fine)
    socket.on('transcript-update', ({ userName, text }) => {
      // Avoid duplicating own lines that were already added locally
      const entry = text.endsWith('\n') ? text : `${text}\n`;
      setSharedTranscript((prev) => {
        const updated = prev ? `${prev}${entry}` : entry;
        sharedTranscriptRef.current = updated;
        return updated;
      });
    });

    return () => {
      socket.emit('leave-room');
      socket.off('room-users');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('room-full');
      socket.off('transcript-update');
    };
  }, [socket, roomId, username, onLeave]);

  const handleLeaveClick = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    // If there's a shared transcript, show summary modal before leaving
    const hasTranscript = sharedTranscriptRef.current && sharedTranscriptRef.current.trim().length > 0;
    if (hasTranscript) {
      setShowSummary(true);
      // The actual leave will happen when user clicks "Done & Leave Room"
    } else {
      onLeave();
    }
  };

  // X button on modal = close only (user stays in room)
  const handleSummaryClose = () => {
    setShowSummary(false);
  };

  // "Done & Leave Room" button = close modal AND leave
  const handleSummaryLeave = () => {
    setShowSummary(false);
    onLeave();
  };

  return (
    <div className="flex w-full h-full bg-gray-900 border-t border-gray-800 relative overflow-hidden">
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
            <VideoCall
              socket={socket}
              users={users}
              username={username}
              onTranscriptUpdate={handleTranscriptUpdate}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 font-mono text-sm">Connecting socket...</div>
        )}
      </div>

      {/* Main Workspace Container with Terminal Editor and Whiteboard Tabs */}
      <div className="flex-1 flex flex-col bg-[#0d0d0d] relative overflow-hidden">
        {/* Workspace Tabs & Header Actions */}
        <div className="flex justify-between items-center bg-[#1a1a1a] border-b border-gray-800 pr-4">
          <div className="flex">
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

          <div className="flex items-center gap-2">
            {/* Live transcript indicator badge */}
            {transcript && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Transcribing
              </div>
            )}

            {/* Slide-Out Transcript Button */}
            <button
              onClick={() => setIsTranscriptOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isTranscriptOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700/80'
              }`}
              title="Toggle Transcript Drawer"
            >
              <FileText size={14} className={isTranscriptOpen ? 'text-white' : 'text-blue-400'} />
              <span>Transcript</span>
            </button>

            <button
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
              title="Generate AI Meeting Summary"
            >
              <BrainCircuit size={14} />
              <span>AI Summary</span>
            </button>
          </div>
        </div>

        {/* Panes rendered simultaneously but toggled via visibility to preserve state */}
        <div className="flex-1 relative">
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${
              activeTab === 'code' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <Editor roomId={roomId} socket={socket} username={username} />
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

      {/* Floating Right-Edge Transcript Toggle Button (visible when drawer is closed) */}
      {!isTranscriptOpen && (
        <button
          onClick={() => setIsTranscriptOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-[#1e1e1e] hover:bg-gray-800 text-gray-300 hover:text-white border-l border-y border-gray-700/80 rounded-l-lg px-2 py-3 shadow-2xl flex flex-col items-center gap-2 transition-all cursor-pointer group"
          title="Open Transcript Drawer"
        >
          <FileText size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-semibold tracking-wider font-mono [writing-mode:vertical-rl] rotate-180">
            Transcript
          </span>
          {transcript && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-0.5" />
          )}
        </button>
      )}

      {/* Slide-Out Transcript Panel Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-[#141414] border-l border-gray-800 shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
          isTranscriptOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-800 bg-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-400" />
            <h3 className="font-semibold text-sm text-gray-200">Meeting Transcript</h3>
            {transcriptMeta.isListening ? (
              <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="text-[10px] text-gray-500 font-mono bg-gray-800 px-1.5 py-0.5 rounded-full">
                Idle
              </span>
            )}
          </div>
          <button
            onClick={() => setIsTranscriptOpen(false)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            title="Close Transcript Panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body: Transcript Content */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-xs leading-relaxed bg-[#0d0d0d]">
          {transcript ? (
            <pre className="text-gray-300 whitespace-pre-wrap break-words font-mono">
              {transcript}
              {transcriptMeta.interimText && (
                <span className="text-gray-500 italic"> {transcriptMeta.interimText}</span>
              )}
            </pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <FileText size={32} className="mb-2 text-gray-600 opacity-60" />
              <p className="text-xs">
                {transcriptMeta.isListening
                  ? 'Listening... start speaking to see real-time transcription.'
                  : 'Transcript is empty. Unmute microphone to start speaking.'}
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-3 border-t border-gray-800 bg-[#1a1a1a] flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-mono">
            {transcript ? transcript.split('\n').filter(Boolean).length : 0} line(s)
          </span>
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            title="Generate AI Meeting Summary"
          >
            <BrainCircuit size={14} />
            <span>AI Summary</span>
          </button>
        </div>
      </div>

      {/* AI Meeting Summary Modal */}
      <MeetingSummary
        isOpen={showSummary}
        onClose={handleSummaryClose}
        onLeave={handleSummaryLeave}
        initialTranscript={sharedTranscript || transcript}
        autoGenerate={!!((sharedTranscript || transcript).trim().length > 0)}
      />
    </div>
  );
};

export default Room;
