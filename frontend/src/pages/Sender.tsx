import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {Video, Mic, MicOff, Camera, CameraOff, Volume2, VolumeX, PhoneOff, Users } from 'lucide-react';

const Sender: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Waiting for receiver...");
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const createWebSocket = () => {
    if (webSocket) {
      return;
    }
    const ws = new WebSocket('wss://backend-server.yasharthsingh0910.workers.dev/ws');
    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.send(JSON.stringify({ type: "join", roomId, role: "sender" }));
    };
    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log("Received message:", data);
      if (data.type === "status" && data.message === "Receiver connected") {
        setStatus("Receiver connected! Setting up connection...");
        createOffer();
      } else if (data.type === "create-answer") {
        peerConnection?.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "ice-candidate" && data.candidate) {
        peerConnection?.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    ws.onclose = () => {
      console.log('WebSocket connection closed, retrying...');
      setWebSocket(null);
      setWsConnected(false);
      setTimeout(createWebSocket, 1000);
    };
    setWebSocket(ws);
  };

  useEffect(() => {
    if (!webSocket && !wsConnected) {
      createWebSocket();
      setWsConnected(true);
    }
    return () => {
      if (webSocket) {
        webSocket.close();
      }
    };
  }, []);

  // Create PeerConnection and Offer
  const createOffer = async () => {
    if (!peerConnection || !webSocket) return;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send the offer to the receiver via WebSocket
      webSocket.send(
        JSON.stringify({ type: "sender-offer", sdp: offer })
      );
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  // Set up video stream and peer connection
  const initWebRTC = async () => {
    if (peerConnection) {
      // Reuse the existing PeerConnection
      return;
    }

    try {
      if (stream) {
        // Stop existing tracks to switch cameras
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = { audio: micOn, video: cameraOn }; // Control mic and camera
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Google's public STUN server
      });

      newStream.getTracks().forEach((track) => pc.addTrack(track, newStream));

      // Handle the remote stream received from the receiver
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && webSocket) {
          webSocket.send(
            JSON.stringify({ type: "ice-candidate", candidate: event.candidate, role: "sender" })
          );
        }
      };

      setPeerConnection(pc);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  };

  // Handle mic and camera state changes
  useEffect(() => {
    if (peerConnection) {
      // Update tracks based on new mic and camera states
      if (stream) {
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];

        if (audioTrack) {
          audioTrack.enabled = micOn;
        }

        if (videoTrack) {
          videoTrack.enabled = cameraOn;
        }
      }

      // Optionally reinitialize the WebRTC connection if necessary
      initWebRTC();
    }
  }, [micOn, cameraOn, peerConnection]);

  useEffect(() => {
    initWebRTC();
  }, [webSocket]);

  // Toggle microphone
  const toggleMic = () => {
    setMicOn((prev) => !prev);
  };

  // Toggle camera
  const toggleCamera = () => {
    setCameraOn((prev) => !prev);
  };

  // Mute remote video
  const toggleRemoteMute = () => {
    setRemoteMuted((prev) => !prev);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteMuted;
    }
  };

  function endCall() {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    if (webSocket) {
      webSocket.close();
      setWebSocket(null);
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
    
    // Optionally, you can delay the navigation
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
              You
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