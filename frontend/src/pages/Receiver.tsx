import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const Receiver: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Waiting for sender...");
  const [micOn, setMicOn] = useState(false); // Microphone state
  const [cameraOn, setCameraOn] = useState(true); // Camera state
  const [remoteMuted, setRemoteMuted] = useState(false); // Remote mute state
  const [stream, setStream] = useState<MediaStream | null>(null); // Media stream

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('wss://backend-server.yasharthsingh0910.workers.dev/ws');

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId, role: "receiver" }));
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log("Received message:", data);

      if (data.type === "status" && data.message === "Connected to sender") {
        setStatus("Connected to sender! Setting up connection...");
      } else if (data.type === "sender-offer") {
        handleOffer(data.sdp);
      } else if (data.type === "ice-candidate" && data.candidate) {
        peerConnection?.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setWebSocket(ws);

    return () => {
      ws.close();
    };
  }, [roomId, peerConnection]);

  // Handle the offer from sender
  const handleOffer = async (offer: any) => {
    if (!peerConnection || !webSocket) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send the answer to the sender via WebSocket
      webSocket.send(
        JSON.stringify({ type: "create-answer", sdp: answer })
      );
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  // Set up video stream and peer connection
    const initWebRTC = async () => {
      try {
        const constraints = { audio: micOn, video: cameraOn }; // Control mic and camera
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(stream);
  
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
  
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Google's public STUN server
        });
  
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  
        // Handle the remote stream received from the sender
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
  
        pc.onicecandidate = (event) => {
          if (event.candidate && webSocket) {
            webSocket.send(
              JSON.stringify({ type: "ice-candidate", candidate: event.candidate, role: "receiver" })
            );
          }
        };
  
        setPeerConnection(pc);
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };
  
    useEffect(() => {
      initWebRTC();
    }, [webSocket, micOn, cameraOn]);
  
    // Handle mic and camera state changes
    useEffect(() => {
      if (peerConnection && stream) {
        // Update tracks based on new mic and camera states
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
  
        if (audioTrack) {
          audioTrack.enabled = micOn;
        }
  
        if (videoTrack) {
          videoTrack.enabled = cameraOn;
        }
  
        // Optionally reinitialize the WebRTC connection if necessary
        initWebRTC();
      }
    }, [micOn, cameraOn, peerConnection]);

  function endCall() {
    if (peerConnection) {
      peerConnection.close();
    }

    if (webSocket) {
      webSocket.close();
    }

    setStatus("Call ended");

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setPeerConnection(null);

    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  }

  const toggleMic = () => {
    setMicOn((prev) => !prev);
  };

  const toggleCamera = () => {
    setCameraOn((prev) => !prev);
  };

  const toggleRemoteMute = () => {
    setRemoteMuted((prev) => !prev);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteMuted;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-white bg-gray-900 min-h-screen">
      <h2 className="text-3xl font-bold mb-4 text-teal-400">Receiver</h2>
      <p className="text-lg mb-2 text-gray-300">Room Id: {roomId}</p>
      <p className="text-lg mb-4 text-gray-300">Status: {status}</p>
      <div className="flex space-x-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-96 h-64 bg-black rounded-lg shadow-lg"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={remoteMuted}
          className="w-96 h-64 bg-black rounded-lg shadow-lg"
        />
      </div>
      <div className="flex space-x-4 mt-6">
        <button
          onClick={toggleMic}
          className="px-6 py-3 rounded-md font-semibold text-lg text-white transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-l hover:from-blue-600 hover:to-blue-500"
        >
          {micOn ? "Turn Off Mic" : "Turn On Mic"}
          <span className="absolute inset-0 bg-blue-300 opacity-30 rounded-md transform scale-0 transition-transform duration-300 group-hover:scale-100"></span>
        </button>
        <button
          onClick={toggleCamera}
          className="px-6 py-3 rounded-md font-semibold text-lg text-white transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:bg-gradient-to-l hover:from-green-600 hover:to-green-500"
        >
          {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
          <span className="absolute inset-0 bg-green-300 opacity-30 rounded-md transform scale-0 transition-transform duration-300 group-hover:scale-100"></span>
        </button>
        <button
          onClick={toggleRemoteMute}
          className="px-6 py-3 rounded-md font-semibold text-lg text-white transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 hover:bg-gradient-to-l hover:from-yellow-600 hover:to-yellow-500"
        >
          {remoteMuted ? "Unmute Remote" : "Mute Remote"}
          <span className="absolute inset-0 bg-yellow-300 opacity-30 rounded-md transform scale-0 transition-transform duration-300 group-hover:scale-100"></span>
        </button>
      </div>
      <button
        onClick={endCall}
        className="mt-6 px-6 py-3 rounded-md font-semibold text-lg text-white transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:bg-gradient-to-l hover:from-red-600 hover:to-red-500"
      >
        End Call
        <span className="absolute inset-0 bg-red-300 opacity-30 rounded-md transform scale-0 transition-transform duration-300 group-hover:scale-100"></span>
      </button>
    </div>
  );
};

export default Receiver;
