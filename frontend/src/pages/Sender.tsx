import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const Sender: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
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
  }, [roomId]);

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
        const constraints = { audio: false, video: true }; // Default video and audio constraints
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Google's public STUN server
        });

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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

  // Poll the status route to check if the receiver is connected
  useEffect(() => {
    const checkStatus = async (roomId: string) => {
      try {
        const response = await fetch(`http://localhost:8080/room/${roomId}/status`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
        if (!response.ok) {
          throw new Error(`Error fetching status: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Room status:", data);
        if (data.receiverConnected) {
          setStatus("Receiver connected!");
          createOffer();
        } else {
          setStatus("Waiting for receiver...");
        }
      } catch (error) {
        console.error("Error fetching status:", error);
      }
    };

    const interval = setInterval(() => checkStatus(roomId!), 5000);
    return () => clearInterval(interval);
  }, [roomId, peerConnection]);

return (
    <div style={{padding: "3px" }}>
        <h2>Sender</h2>
        <p style={{ fontSize: "19px" }}>Room Id: {roomId}</p>
        <p style={{ fontSize: "20px" }}>Status: {status}</p>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "600px", height: "500px", backgroundColor: "black" }} />
        <br />
        <button style={{ alignSelf: "center"}}> End Call</button>
    </div>
);
};

export default Sender;
