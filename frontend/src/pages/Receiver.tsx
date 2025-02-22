import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Video, Mic, MicOff, Camera, CameraOff, Volume2, VolumeX, PhoneOff, Users, Monitor, StopCircle } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

const Receiver: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Waiting for sender...");
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  useEffect(() => {
    let mounted = true;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5; // Increased attempts
    const reconnectDelay = 2000; // Increased delay
    let currentSocket: Socket | null = null;
    const setupConnection = async () => {
      try {
        // Clean up any existing connections first
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
        if (peerConnection) {
          peerConnection.close();
          setPeerConnection(null);
        }
        
        // Initialize socket with better error handling
        currentSocket = io('http://localhost:8787', {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: reconnectDelay,
          timeout: 60000,
          forceNew: true,
          autoConnect: true
        });
    
        // Setup socket event handlers
        currentSocket.on('connect_error', (error) => {
          console.error('Connection Error:', error);
          setStatus('Connection error. Retrying...');
          reconnectAttempts++;
          
          if (reconnectAttempts >= maxReconnectAttempts) {
            setStatus('Connection failed. Please refresh the page.');
            currentSocket?.disconnect();
          }
        });
    
        currentSocket.on('connect', async () => {
          console.log('Socket connected');
          reconnectAttempts = 0; // Reset attempts on successful connection
          
          try {
            const pc = await initWebRTC();
            if (mounted && pc) {
              setStatus('Connected. Joining room...');
              currentSocket?.emit('join', { roomId, role: 'receiver' });
            }
          } catch (error) {
            console.error('WebRTC initialization error:', error);
            setStatus('Failed to initialize video. Please check permissions.');
          }
        });
    
        currentSocket.on('disconnect', () => {
          console.log('Socket disconnected');
          setStatus('Connection lost. Attempting to reconnect...');
        });
        
        currentSocket.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after', attemptNumber, 'attempts');
          setStatus('Reconnected! Rejoining room...');
          currentSocket?.emit('join', { roomId, role: 'receiver' });
        });
        
        currentSocket.on('reconnect_failed', () => {
          console.log('Socket reconnection failed');
          setStatus('Connection failed. Please refresh the page.');
        });
        
        currentSocket.on('status', (data) => {
          console.log('Received status:', data);
          if (mounted && data.message === "Connected to sender") {
            setStatus("Connected to sender! Setting up connection...");
          }
        });
        currentSocket.on('sender-offer', async (data) => {
          if (!mounted) return;
          
          try {
            // Ensure we have an active socket connection
            if (!currentSocket?.connected) {
              throw new Error('No active socket connection');
            }

            // Initialize or reinitialize WebRTC if needed
            let pc = peerConnection;
            if (!pc || pc.connectionState === 'closed') {
              pc = await initWebRTC();
            }

            await handleOffer(data.sdp, currentSocket);
          } catch (error) {
            console.error('Error handling offer:', error);
            setStatus('Connection error. Please refresh the page.');
          }
        });
    
        if (mounted) {
          setSocket(currentSocket);
        }
      } catch (error) {
        console.error('Error in setup:', error);
        if (mounted) {
          setStatus('Failed to setup connection. Please try again.');
        }
      }
    };
    setupConnection();
    return () => {
      mounted = false;
      reconnectAttempts = 0;
      if (socket) {
        socket.disconnect();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }
    };
  }, [roomId]);
  const initWebRTC = async () => {
    try {
      // Ensure proper cleanup of existing connection
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      // Initialize media stream with both audio and video enabled
      const constraints = { 
        audio: true,  // Always initialize audio
        video: true   // Always initialize video
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set initial track states
      newStream.getAudioTracks().forEach(track => track.enabled = micOn);
      newStream.getVideoTracks().forEach(track => track.enabled = cameraOn);
      
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
        ]
      });
      
      // Add all tracks to the peer connection
      newStream.getTracks().forEach((track) => {
        pc.addTrack(track, newStream);
        console.log('Added local track:', track.kind);
      });
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (remoteVideoRef.current && event.streams[0]) {
          // Store the current stream to check if it changes
          const currentStream = remoteVideoRef.current.srcObject;
          
          // Only set new stream if it's different from the current one
          if (currentStream !== event.streams[0]) {
            // Stop all tracks in the current stream before replacing
            if (currentStream instanceof MediaStream) {
              currentStream.getTracks().forEach(track => track.stop());
            }
            
            // Set new stream and ensure video element is ready
            remoteVideoRef.current.srcObject = event.streams[0];
            
            // Use loadedmetadata event to ensure video is ready before playing
            remoteVideoRef.current.onloadedmetadata = () => {
              remoteVideoRef.current?.play()
                .then(() => {
                  console.log('Remote video playback started successfully');
                  setStatus('Connected! Video stream established.');
                })
                .catch(error => {
                  console.error('Error playing remote video:', error);
                  // Retry playback once after a short delay
                  setTimeout(() => {
                    remoteVideoRef.current?.play()
                      .then(() => console.log('Remote video playback started after retry'))
                      .catch(e => console.error('Failed to play remote video after retry:', e));
                  }, 1000);
                });
            };
            
            console.log('Set remote video source');
          }
        }
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', { roomId, candidate: event.candidate, role: 'receiver' });
        }
      };
      pc.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          setStatus('Connected! Video stream established.');
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setStatus('Connection lost. Please try rejoining the room.');
        }
      };
      pc.onsignalingstatechange = () => {
        console.log('Signaling State:', pc.signalingState);
      };
      setPeerConnection(pc);
      return pc;
    } catch (error) {
      console.error("Error in initWebRTC:", error);
      setStatus('Failed to initialize WebRTC. Please check your camera/microphone permissions.');
      throw error;
    }
  };
  const handleOffer = async (sdp: RTCSessionDescriptionInit, activeSocket: Socket) => {
    try {
      let currentPeerConnection = peerConnection;
      if (!currentPeerConnection || currentPeerConnection.signalingState === 'closed') {
        currentPeerConnection = await initWebRTC();
      }
      console.log('Setting remote description...');
      await currentPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('Creating answer...');
      const answer = await currentPeerConnection.createAnswer();
      console.log('Setting local description...');
      await currentPeerConnection.setLocalDescription(answer);
      
      if (activeSocket.connected) {
        console.log('Sending answer to sender...');
        activeSocket.emit('sdp', { roomId, sdp: answer, role: 'receiver' });
        console.log('Successfully processed offer and sent answer');
      } else {
        throw new Error('Socket disconnected while sending answer');
      }
    } catch (error) {
      console.error('Error in handleOffer:', error);
      setStatus('Connection error. Please refresh the page.');
      throw error;
    }
  };
  useEffect(() => {
    if (peerConnection && stream) {
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = micOn;
      }

      if (videoTrack) {
        videoTrack.enabled = cameraOn;
      }
    }
  }, [micOn, cameraOn, stream, peerConnection]);
  // Remove the redundant useEffect that was causing multiple initializations
  // useEffect(() => {
  //   initWebRTC();
  // }, [socket]);
  const toggleMic = () => setMicOn((prev) => !prev);
  const toggleCamera = () => setCameraOn((prev) => !prev);

  const toggleRemoteMute = () => {
    setRemoteMuted((prev) => !prev);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteMuted;
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setStream(screenStream);
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          initWebRTC();
        };

        if (peerConnection) {
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(sender => sender.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        }
      } catch (error) {
        console.error("Error starting screen share:", error);
        setIsScreenSharing(false);
      }
    }
  };

  function endCall() {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
  
    if (socket) {
      socket.close();
      setSocket(null);
    }
  
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  
    setStatus("Call ended");
  
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  }

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700 p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Video className="h-8 w-8 text-cyan-400" />
            <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">LiveLink</span>
          </div>
          <div className="flex items-center space-x-4">
            <p className="text-cyan-400">Room ID: {roomId}</p>
            <p className="text-blue-300">Status: {status}</p>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row p-4 space-y-4 md:space-y-0 md:space-x-4 overflow-hidden">
        <div className="flex-grow flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 overflow-hidden">
          <div className="relative flex-grow min-h-0">

            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={remoteMuted}
              className="w-full h-full bg-gray-800 rounded-lg shadow-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-gray-900/70 px-2 py-1 rounded-md text-sm">
              Remote
            </div>
          </div>
          <div className="relative flex-grow min-h-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted // Always mute local video to prevent feedback
              className="w-full h-full bg-gray-800 rounded-lg shadow-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-gray-900/70 px-2 py-1 rounded-md text-sm">
              You {isScreenSharing && "(Screen)"}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800/50 backdrop-blur-md border-t border-gray-700 p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center items-center gap-4">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 ${
              micOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </button>
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 ${
              cameraOn ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {cameraOn ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
          </button>
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 ${
              isScreenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {isScreenSharing ? <StopCircle className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
          </button>
          <button
            onClick={toggleRemoteMute}
            className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 ${
              remoteMuted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {remoteMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>
          <button
            onClick={endCall}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all duration-300"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <div className="text-sm text-gray-400 flex items-center">
            <Users className="h-4 w-4 mr-1" /> 1 participant
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Receiver;