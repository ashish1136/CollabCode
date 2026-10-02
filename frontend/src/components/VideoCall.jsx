import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSpeechTranscription } from '../hooks/useSpeechTranscription';
import {
  Mic, MicOff, Video, VideoOff
} from 'lucide-react';

const VideoPlayer = ({ stream, isLocal, username }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});

      const handleTrackChange = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      };

      stream.addEventListener('addtrack', handleTrackChange);
      stream.addEventListener('removetrack', handleTrackChange);
      return () => {
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.removeEventListener('removetrack', handleTrackChange);
      };
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden shrink-0 border border-gray-700/80 aspect-video shadow-md group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
      />
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs text-white backdrop-blur-sm shadow border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
        {username} {isLocal ? '(You)' : ''}
      </div>
    </div>
  );
};

const VideoCall = ({ socket, users, username, onTranscriptUpdate }) => {
  const { localStream, remoteStreams } = useWebRTC(socket, users);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [showLiveTranscript, setShowLiveTranscript] = useState(false);

  const {
    transcript,
    interimText,
    isListening,
    isSupported,
  } = useSpeechTranscription({ username, micOn });

  const transcriptEndRef = useRef(null);

  // Bubble transcript and live status up to Room for slide-out drawer & AI summary
  useEffect(() => {
    if (onTranscriptUpdate) {
      onTranscriptUpdate(transcript, { interimText, isListening, isSupported });
    }
  }, [transcript, interimText, isListening, isSupported, onTranscriptUpdate]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !cameraOn;
      });
      setCameraOn(!cameraOn);
    }
  };

  const remoteUsers = users.filter(u => u.id !== socket?.id);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 p-4">
      {/* Local Client Video and Controls */}
      <div className="flex flex-col gap-2 relative">
        <VideoPlayer
          stream={localStream}
          isLocal={true}
          username={users.find(u => u.id === socket?.id)?.username || 'me'}
        />
        {localStream && (
          <div className="flex justify-center gap-3 bg-gray-800/80 py-2 px-4 rounded-lg flex-wrap items-center">
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-full transition-all shadow-sm ${micOn ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'}`}
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-2.5 rounded-full transition-all shadow-sm ${cameraOn ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'}`}
              title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
          </div>
        )}
      </div>

      {/* Remote Peers Video Streams */}
      {remoteUsers.map(user => {
        const rStream = remoteStreams[user.id];
        if (rStream) {
          return (
            <VideoPlayer
              key={user.id}
              stream={rStream}
              isLocal={false}
              username={user.username}
            />
          );
        }
        // Connecting placeholder while WebRTC handshake is in progress
        return (
          <div
            key={user.id}
            className="relative bg-gray-900 rounded-lg overflow-hidden shrink-0 border border-gray-700/40 aspect-video shadow-md flex flex-col items-center justify-center gap-2"
          >
            <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-semibold text-sm border border-gray-600">
              {user.username?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-[11px] text-gray-400 font-medium">{user.username}</p>
            <div className="flex gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-[9px] text-gray-600 font-mono">connecting…</p>
          </div>
        );
      })}
    </div>
  );
};

export default VideoCall;
