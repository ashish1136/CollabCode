import { useEffect, useRef, useState, useCallback } from 'react';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = (socket, users) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const prevUsersRef = useRef([]);

  const createPeerConnection = useCallback((remoteUserId, isInitiator) => {
    if (peersRef.current[remoteUserId]) return peersRef.current[remoteUserId];

    const pc = new RTCPeerConnection(configuration);
    
    // Add existing tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          to: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [remoteUserId]: event.streams[0],
      }));
    };

    pc.onconnectionstatechange = () => {
       if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
         setRemoteStreams((prev) => {
           const newStreams = { ...prev };
           delete newStreams[remoteUserId];
           return newStreams;
         });
         delete peersRef.current[remoteUserId];
       }
    };

    let makingOffer = false;

    // Use perfect negotiation logic
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        socket.emit('webrtc-offer', {
          to: remoteUserId,
          offer: pc.localDescription,
        });
      } catch (err) {
        console.error(err);
      } finally {
        makingOffer = false;
      }
    };
    
    // Attach makingOffer to PC object so we can read it on incoming offer
    pc._makingOffer = () => makingOffer;
    pc._isInitiator = isInitiator;

    peersRef.current[remoteUserId] = pc;
    return pc;
  }, [socket]);

  // Boot local media stream on mount
  useEffect(() => {
    let stream;
    let mounted = true;
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!mounted) {
           s.getTracks().forEach(track => track.stop());
           return;
        }
        stream = s;
        setLocalStream(stream);
        localStreamRef.current = stream;
        
        // If there are existing connections established before media was ready, add tracks now.
        // This will trigger 'onnegotiationneeded' and send updated offers automatically.
        Object.values(peersRef.current).forEach(pc => {
           stream.getTracks().forEach(track => {
             pc.addTrack(track, stream);
           });
        });
      })
      .catch((err) => {
        console.error("Error accessing local media device", err);
      });
      
    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      Object.keys(peersRef.current).forEach(id => {
        peersRef.current[id].close();
      });
    };
  }, []);

  // Sync users to initiate and destroy PeerConnections
  useEffect(() => {
    if (!socket) return;

    const currentUsers = users.filter(u => u.id !== socket.id);
    const prevUsers = prevUsersRef.current;
    
    // For new users, we define initiator deterministically to avoid both creating PCs first and missing onnegotiationneeded
    const newUsers = currentUsers.filter(u => !prevUsers.some(p => p.id === u.id));
    
    newUsers.forEach((user) => {
       const isInitiator = socket.id > user.id;
       // Simply creating the PC adds the tracks (if available) and fires onnegotiationneeded
       createPeerConnection(user.id, isInitiator);
    });

    // Cleanup resources for left users
    const leftUsers = prevUsers.filter(u => !currentUsers.some(c => c.id === u.id));
    leftUsers.forEach(user => {
      if (peersRef.current[user.id]) {
        peersRef.current[user.id].close();
        delete peersRef.current[user.id];
      }
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[user.id];
        return newStreams;
      });
    });

    prevUsersRef.current = currentUsers;
  }, [users, socket, createPeerConnection]);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!socket) return;
    let ignoreOffer = false;
    
    const onOffer = async ({ from, offer }) => {
      // Determine polarity: we compare socket IDs. 
      const isInitiator = socket.id > from;
      const pc = createPeerConnection(from, isInitiator);
      const polite = !isInitiator;
      
      const offerCollision = offer.type === "offer" && (pc._makingOffer() || pc.signalingState !== "stable");
      ignoreOffer = !polite && offerCollision;

      if (ignoreOffer) {
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        if (offer.type === "offer") {
          await pc.setLocalDescription();
          socket.emit('webrtc-offer', {
            to: from,
            offer: pc.localDescription, // works as answer because setLocalDescription automatically creates an answer if remote description is an offer
          });
        }
      } catch (err) {
        console.error("Error handling offer/answer", err);
      }
    };

    const onAnswer = async ({ from, answer }) => {
      // Just re-use the onOffer logic which handles both due to perfect negotiation structure
      await onOffer({ from, offer: answer });
    };

    const onIceCandidate = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      try {
        if (pc && candidate && !ignoreOffer) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("Error adding ice candidate", err);
      }
    };

    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('webrtc-ice-candidate', onIceCandidate);

    return () => {
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('webrtc-ice-candidate', onIceCandidate);
    };
  }, [socket, createPeerConnection]);

  return { localStream, remoteStreams };
};
