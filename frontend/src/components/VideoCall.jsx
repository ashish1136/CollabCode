import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

const VideoPlayer = ({ stream, isLocal, username }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
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
        {username} {isLocal ? "(You)" : ""}
      </div>
    </div>
  );
};

const VideoCall = ({ socket, users }) => {
  const { localStream, remoteStreams } = useWebRTC(socket, users);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
       {/* Local Client Video and Controls */}
       <div className="flex flex-col gap-2 relative">
          <VideoPlayer 
            stream={localStream} 
            isLocal={true} 
            username={users.find(u => u.id === socket?.id)?.username || "me"} 
          />
          {localStream && (
             <div className="flex justify-center gap-3 bg-gray-800/80 py-2 px-4 rounded-lg flex-wrap items-center">
               <button 
                 onClick={toggleMic}
                 className={`p-2.5 rounded-full transition-all shadow-sm ${micOn ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'}`}
               >
                 {micOn ? <Mic size={16} /> : <MicOff size={16} />}
               </button>
               <button 
                 onClick={toggleCamera}
                 className={`p-2.5 rounded-full transition-all shadow-sm ${cameraOn ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'}`}
               >
                 {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
               </button>
             </div>
          )}
       </div>

       {/* Remote Peers Video Streams */}
       {remoteUsers.map(user => {
         const rStream = remoteStreams[user.id];
         return (
           <VideoPlayer
             key={user.id}
             stream={rStream}
             isLocal={false}
             username={user.username}
           />
         );
       })}
    </div>
  );
};

export default VideoCall;
