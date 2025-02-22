import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Video, Mic, MicOff, Camera, CameraOff, Volume2, VolumeX, PhoneOff, Users, Monitor, StopCircle } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

const Sender: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Waiting for receiver...");
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  useEffect(() => {
    let mounted = true;
    let currentPeerConnection: RTCPeerConnection | null = null;
    
    const setupConnection = async () => {
      try {
        // Initialize WebRTC first and store the reference
        currentPeerConnection = await initWebRTC();
        
        const newSocket = io('http://localhost:8787', {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 60000,
          forceNew: true
        });
        newSocket.on('connect_error', (error) => {
          console.error('Connection Error:', error);
        });
        newSocket.on('connect', () => {
          console.log('Socket connected');
          newSocket.emit('join', { roomId, role: 'sender' });
        });
        newSocket.on('status', async (data) => {
          console.log('Received status:', data);
          if (data.message === "Receiver connected" && mounted) {
            setStatus("Receiver connected! Setting up connection...");
            
            // Check if we need to reinitialize the connection
            if (!currentPeerConnection || currentPeerConnection.signalingState === 'closed') {
              console.log('Reinitializing WebRTC connection...');
              currentPeerConnection = await initWebRTC();
            }
            // Create offer with the current connection
            if (currentPeerConnection && currentPeerConnection.signalingState !== 'closed') {
              try {
                const offer = await currentPeerConnection.createOffer();
                await currentPeerConnection.setLocalDescription(offer);
                newSocket.emit('sender-offer', { roomId, sdp: offer });
              } catch (error) {
                console.error("Error creating offer:", error);
                setStatus('Failed to create offer. Retrying connection...');
                currentPeerConnection = await initWebRTC();
              }
            }
          }
        });
        newSocket.on('ice-candidate', async (data) => {
          if (peerConnection && data.candidate) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
              console.log('Added ICE candidate successfully');
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
        });
        newSocket.on('sdp', async (data) => {
          if (peerConnection && data.sdp) {
            try {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
              console.log('Set remote description successfully');
            } catch (error) {
              console.error("Error setting remote description:", error);
            }
          }
        });
        if (mounted) {
          setSocket(newSocket);
        }
      } catch (error) {
        console.error('Error in setupConnection:', error);
        if (mounted) {
          setStatus('Failed to setup connection. Please try again.');
        }
      }
    };
    
    setupConnection();
    
    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (currentPeerConnection) {
        currentPeerConnection.close();
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
      let newStream;
      if (isScreenSharing) {
        newStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      }
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
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log('Set remote video source');
          setStatus('Connected! Video stream established.');
        }
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', { roomId, candidate: event.candidate, role: 'sender' });
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
      } catch (error) {
        console.error("Error sharing screen:", error);
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
              ref={videoRef}
              autoPlay
              playsInline
              muted={!micOn}
              className="w-full h-full bg-gray-800 rounded-lg shadow-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-gray-900/70 px-2 py-1 rounded-md text-sm">
              You {isScreenSharing && "(Screen)"}
            </div>
          </div>
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

export default Sender;