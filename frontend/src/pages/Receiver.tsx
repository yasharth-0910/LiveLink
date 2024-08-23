import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const Receiver: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Waiting for sender...");
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const createWebSocket = () => {
      if (webSocket) return;

      const ws = new WebSocket('wss://backend-server.yasharthsingh0910.workers.dev/ws');

      ws.onopen = () => {
        console.log('WebSocket connection established');
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

      ws.onclose = () => {
        console.log('WebSocket connection closed, retrying...');
        setWebSocket(null);
        setWsConnected(false);
        setTimeout(createWebSocket, 1000);
      };

      setWebSocket(ws);
    };

    createWebSocket();

    return () => {
      if (webSocket) {
        webSocket.close();
      }
    };
  }, [roomId, peerConnection]);

  // Handle the incoming offer from the sender
  const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
    if (!peerConnection || !webSocket) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
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
    if (peerConnection) return; // Reuse the existing PeerConnection

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

  // End call and clean up
  const endCall = () => {
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
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-white bg-gray-900 min-h-screen">
      <h2 className="text-3xl font-bold mb-4 text-teal-400">Receiver</h2>
      <p className="text-lg mb-2 text-gray-300">Room Id: {roomId}</p>
      <p className="text-lg mb-4 text-gray-300">Status: {status}</p>
      <div className="flex space-x-4">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={remoteMuted}
          className="w-96 h-64 bg-black rounded-lg shadow-lg"
        />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!micOn}
          className="w-96 h-64 bg-black rounded-lg shadow-lg"
        />
      </div>
      <div className="flex space-x-4 mt-6">
        <button
          onClick={toggleMic}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300"
        >
          {micOn ? "Turn Off Mic" : "Turn On Mic"}
        </button>
        <button
          onClick={toggleCamera}
          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-300"
        >
          {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
        </button>
        <button
          onClick={toggleRemoteMute}
          className="px-6 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors duration-300"
        >
          {remoteMuted ? "Unmute Remote" : "Mute Remote"}
        </button>
      </div>
      <button
        onClick={endCall}
        className="mt-6 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-300"
      >
        End Call
      </button>
    </div>
  );
};

export default Receiver;
