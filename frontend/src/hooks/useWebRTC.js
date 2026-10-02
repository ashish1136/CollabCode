import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
};

export const useWebRTC = (socket, users) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // { [remoteUserId]: RTCPeerConnection }
  const iceCandidatesQueue = useRef({}); // { [remoteUserId]: Array<RTCIceCandidateInit> }
  const prevUserIdsRef = useRef(new Set());

  // ── Helpers ──────────────────────────────────────────────────────────────

  const logPCState = (userId, pc, tag = '') => {
    const prefix = `[WebRTC][${userId}]${tag ? ` (${tag})` : ''}`;
    console.log(`${prefix} Connection:`, pc.connectionState);
    console.log(`${prefix} ICE:`, pc.iceConnectionState);
    console.log(`${prefix} Signaling:`, pc.signalingState);
  };

  const addRemoteStream = useCallback((userId, stream) => {
    console.log(`[WebRTC][${userId}] Setting remote stream in state with ${stream.getTracks().length} track(s)`);
    setRemoteStreams((prev) => ({ ...prev, [userId]: stream }));
  }, []);

  const removePeer = useCallback((userId) => {
    if (peersRef.current[userId]) {
      console.log(`[WebRTC][${userId}] Closing and removing RTCPeerConnection`);
      peersRef.current[userId].close();
      delete peersRef.current[userId];
    }
    delete iceCandidatesQueue.current[userId];
    setRemoteStreams((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  /**
   * Drain any queued ICE candidates that arrived before remoteDescription was set
   */
  const drainCandidateQueue = useCallback(async (userId, pc) => {
    const queue = iceCandidatesQueue.current[userId];
    if (queue && queue.length > 0) {
      console.log(`[WebRTC][${userId}] Draining ${queue.length} queued ICE candidate(s)...`);
      while (queue.length > 0) {
        const candidate = queue.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`[WebRTC][${userId}] addIceCandidate() called successfully (from queue)`);
        } catch (err) {
          console.error(`[WebRTC][${userId}] Error adding queued ICE candidate:`, err);
        }
      }
    }
  }, []);

  /**
   * Wait for localStream to be acquired if an offer arrives early
   */
  const waitForLocalStream = useCallback(() => {
    return new Promise((resolve) => {
      if (localStreamRef.current) return resolve(localStreamRef.current);
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 100;
        if (localStreamRef.current || elapsed >= 5000) {
          clearInterval(interval);
          resolve(localStreamRef.current);
        }
      }, 100);
    });
  }, []);

  /**
   * Build an RTCPeerConnection with STUN configuration, wire up handlers.
   */
  const buildPC = useCallback(
    (remoteUserId) => {
      const existing = peersRef.current[remoteUserId];
      if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
        return existing;
      }
      if (existing) {
        existing.close();
      }

      console.log(`[WebRTC][${remoteUserId}] Initializing RTCPeerConnection with STUN: stun:stun.l.google.com:19302`);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peersRef.current[remoteUserId] = pc;
      if (!iceCandidatesQueue.current[remoteUserId]) {
        iceCandidatesQueue.current[remoteUserId] = [];
      }

      // Add local tracks so remote peer receives our audio/video
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log(`[WebRTC][${remoteUserId}] Adding local track:`, track.kind);
          pc.addTrack(track, localStreamRef.current);
        });
      } else {
        console.warn(`[WebRTC][${remoteUserId}] localStreamRef.current not ready during buildPC`);
      }

      // Forward ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[WebRTC][${remoteUserId}] Emitting local ICE candidate:`, event.candidate.candidate);
          socket.emit('webrtc-ice-candidate', {
            to: remoteUserId,
            candidate: event.candidate,
          });
        } else {
          console.log(`[WebRTC][${remoteUserId}] ICE candidate gathering complete`);
        }
      };

      // Receive remote stream
      pc.ontrack = (event) => {
        console.log(`[WebRTC][${remoteUserId}] ontrack event received:`, event.track.kind);
        const stream =
          event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        addRemoteStream(remoteUserId, stream);
      };

      // Lifecycle listeners
      pc.onconnectionstatechange = () => {
        logPCState(remoteUserId, pc, 'connectionstatechange');
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          console.warn(`[WebRTC][${remoteUserId}] Connection state is ${pc.connectionState}, cleaning up.`);
          removePeer(remoteUserId);
        }
      };

      pc.oniceconnectionstatechange = () => {
        logPCState(remoteUserId, pc, 'iceconnectionstatechange');
        if (pc.iceConnectionState === 'failed' && pc.restartIce) {
          console.warn(`[WebRTC][${remoteUserId}] ICE failed, attempting restartIce()`);
          pc.restartIce();
        }
      };

      pc.onsignalingstatechange = () => {
        logPCState(remoteUserId, pc, 'signalingstatechange');
      };

      logPCState(remoteUserId, pc, 'initialized');
      return pc;
    },
    [socket, addRemoteStream, removePeer]
  );

  /**
   * Create PC + send offer to remoteUserId (initiator role)
   */
  const initiateCall = useCallback(
    async (remoteUserId) => {
      console.log(`[WebRTC][${remoteUserId}] Initiating call (creating SDP offer)...`);
      const pc = buildPC(remoteUserId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log(`[WebRTC][${remoteUserId}] setLocalDescription(offer) applied`);
        logPCState(remoteUserId, pc, 'post-offer');

        socket.emit('webrtc-offer', {
          to: remoteUserId,
          offer: pc.localDescription,
        });
        console.log(`[WebRTC][${remoteUserId}] SDP offer emitted via Socket.IO`);
      } catch (err) {
        console.error(`[WebRTC][${remoteUserId}] createOffer/setLocalDescription failed:`, err);
      }
    },
    [socket, buildPC]
  );

  // ── Boot local media ──────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    let stream;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!mounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        console.log('[WebRTC] Local media stream ready with tracks:', s.getTracks().map((t) => t.kind));
        stream = s;
        localStreamRef.current = s;
        setLocalStream(s);

        // Attach tracks to any peer connections created before media was ready
        Object.entries(peersRef.current).forEach(([peerId, pc]) => {
          if (pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
            const senders = pc.getSenders();
            s.getTracks().forEach((track) => {
              const alreadyAdded = senders.some((snd) => snd.track && snd.track.kind === track.kind);
              if (!alreadyAdded) {
                console.log(`[WebRTC][${peerId}] Adding local ${track.kind} track to existing connection`);
                pc.addTrack(track, s);
              }
            });
          }
        });
      })
      .catch((err) => console.error('[WebRTC] getUserMedia error:', err));

    return () => {
      mounted = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      iceCandidatesQueue.current = {};
    };
  }, []);

  // ── Handle user list changes & trigger initiation ────────────────────────

  useEffect(() => {
    if (!socket || !localStream) return;

    const remoteUsers = users.filter((u) => u.id !== socket.id);
    const currentIds = new Set(remoteUsers.map((u) => u.id));
    const prevIds = prevUserIdsRef.current;

    // Decide who initiates using deterministic socket ID comparison
    remoteUsers.forEach((user) => {
      if (!prevIds.has(user.id)) {
        const weInitiate = socket.id > user.id;
        console.log(
          `[WebRTC] Discovered user ${user.id} (${user.username}). We initiate? ${weInitiate} (${socket.id} > ${user.id})`
        );
        if (weInitiate) {
          initiateCall(user.id);
        }
      }
    });

    // Clean up users who left
    prevIds.forEach((id) => {
      if (!currentIds.has(id)) {
        console.log(`[WebRTC] User ${id} left room. Cleaning up peer.`);
        removePeer(id);
      }
    });

    prevUserIdsRef.current = currentIds;
  }, [users, socket, localStream, initiateCall, removePeer]);

  // ── Signaling handlers ────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    /**
     * Incoming offer
     */
    const onOffer = async ({ from, offer }) => {
      console.log(`[WebRTC][${from}] Received webrtc-offer`);

      // If local media is not yet ready, wait briefly so answer includes our tracks
      if (!localStreamRef.current) {
        console.log(`[WebRTC][${from}] Waiting for localStream before answering offer...`);
        await waitForLocalStream();
      }

      let pc = peersRef.current[from];
      if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        pc = buildPC(from);
      }

      // Ensure local tracks are attached
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        localStreamRef.current.getTracks().forEach((track) => {
          const alreadyAdded = senders.some((s) => s.track && s.track.kind === track.kind);
          if (!alreadyAdded) {
            console.log(`[WebRTC][${from}] Attaching local ${track.kind} track to answer`);
            pc.addTrack(track, localStreamRef.current);
          }
        });
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log(`[WebRTC][${from}] setRemoteDescription(offer) succeeded`);
        logPCState(from, pc, 'post-setRemoteDescription-offer');

        // Drain any ICE candidates received before remoteDescription was set
        await drainCandidateQueue(from, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`[WebRTC][${from}] setLocalDescription(answer) succeeded`);
        logPCState(from, pc, 'post-setLocalDescription-answer');

        socket.emit('webrtc-answer', {
          to: from,
          answer: pc.localDescription,
        });
        console.log(`[WebRTC][${from}] Emitted webrtc-answer via Socket.IO`);
      } catch (err) {
        console.error(`[WebRTC][${from}] Error handling webrtc-offer:`, err);
      }
    };

    /**
     * Incoming answer
     */
    const onAnswer = async ({ from, answer }) => {
      console.log(`[WebRTC][${from}] Received webrtc-answer`);
      const pc = peersRef.current[from];
      if (!pc) {
        console.warn(`[WebRTC][${from}] Received answer but no RTCPeerConnection found.`);
        return;
      }
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`[WebRTC][${from}] Received answer in unexpected signalingState: ${pc.signalingState}`);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`[WebRTC][${from}] setRemoteDescription(answer) succeeded`);
        logPCState(from, pc, 'post-setRemoteDescription-answer');

        // Drain any ICE candidates received before remoteDescription was set
        await drainCandidateQueue(from, pc);
      } catch (err) {
        console.error(`[WebRTC][${from}] Error applying remote answer:`, err);
      }
    };

    /**
     * Incoming ICE Candidate
     */
    const onIceCandidate = async ({ from, candidate }) => {
      if (!candidate) return;
      console.log(`[WebRTC][${from}] Received remote ICE candidate:`, candidate.candidate ? candidate.candidate : candidate);

      const pc = peersRef.current[from];

      // If PC doesn't exist yet or remote description is not set, QUEUE candidate
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
        console.log(`[WebRTC][${from}] Remote description not set yet. Queuing ICE candidate.`);
        if (!iceCandidatesQueue.current[from]) {
          iceCandidatesQueue.current[from] = [];
        }
        iceCandidatesQueue.current[from].push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`[WebRTC][${from}] addIceCandidate() called successfully`);
      } catch (err) {
        console.error(`[WebRTC][${from}] addIceCandidate() failed:`, err);
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
  }, [socket, buildPC, waitForLocalStream, drainCandidateQueue]);

  return { localStream, remoteStreams };
};
