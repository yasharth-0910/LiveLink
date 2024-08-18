import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const Receiver: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    const socket = new WebSocket('wss://live-link-l2rt.vercel.app');


    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', role: 'receiver', roomId }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'sender-offer') {
        handleOffer(data.sdp, socket);
      } else if (data.type === 'ice-candidate' && data.candidate) {
        peerConnection?.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    setWebSocket(socket);
    return () => socket.close();
  }, [roomId, peerConnection]);

  const handleOffer = async (offer: RTCSessionDescriptionInit, socket: WebSocket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const constraints = { audio: false, video: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (videoRef.current) videoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && webSocket) {
        socket.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.send(JSON.stringify({ type: 'create-answer', sdp: answer }));
    setPeerConnection(pc);
  };

  function endcall() {
    if (peerConnection) {
      peerConnection.close();
    }

    if (webSocket) {
      webSocket.close();
    }


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
    <div>
      <h1>Receiver's Room: {roomId}</h1>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '500px', height: '400px', backgroundColor: 'black' }} />
      <br />
      <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '500px', height: '400px', backgroundColor: 'black' }} />
      <button onClick={endcall}>end call</button>
    </div>
  );
};

export default Receiver;
