import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const Sender: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null); // New ref for remote video
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Waiting for receiver...");

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
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

    setWebSocket(ws);

    return () => {
      ws.close();
    };
  }, [roomId, peerConnection]);

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
  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const constraints = { audio: false, video: true }; // Enable both audio and video
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Google's public STUN server
        });

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
      <h2>Sender</h2>
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

export default Sender;
