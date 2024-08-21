import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const Receiver: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Waiting for sender...");

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
  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const constraints = { audio: true, video: true }; // Enable both audio and video
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

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

    initWebRTC();
  }, [webSocket]);

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

  return (
    <div style={{ padding: "3px" }}>
      <h2>Receiver</h2>
      <p style={{ fontSize: "19px" }}>Room Id: {roomId}</p>
      <p style={{ fontSize: "20px" }}>Status: {status}</p>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "600px", height: "500px", backgroundColor: "black" }} />
      <br />
      <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "600px", height: "500px", backgroundColor: "black" }} />
      <br />
      <button style={{ alignSelf: "center" }} onClick={endCall}>End Call</button>
    </div>
  );
};

export default Receiver;
