import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const Receiver = () => {
  const { roomId } = useParams<{ roomId: string }>();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', role: 'receiver', roomId }));
    };

  }, [roomId]);

  return (
    <div>
      <h1>Receiver's Room: {roomId}</h1>
      <video id="receiver-video" autoPlay></video>
    </div>
  );
};

export default Receiver;
