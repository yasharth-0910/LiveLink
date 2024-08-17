import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  const handleCreateRoom = () => {
    // Generate a random roomId and navigate to the sender page
    const generatedRoomId = Math.random().toString(36);
    navigate(`/sender/${generatedRoomId}`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/receiver/${roomId}`);
    }
  };

  return (
    <div>
      <h1>Welcome to Video Call App</h1>
      <button onClick={handleCreateRoom}>Start as Sender</button>
      <div>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={handleJoinRoom}>Join as Receiver</button>
      </div>
    </div>
  );
};

export default Homepage;
