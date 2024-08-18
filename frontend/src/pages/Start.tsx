import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Homepage = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    // Generate a unique roomId
    const newRoomId = Math.random().toString(36).substring(2, 10);
    navigate(`/sender/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/receiver/${roomId}`);
    }
  };

  return (
    <div>
      <h1>Welcome to the Video Call App</h1>
      <button onClick={handleCreateRoom}>Create Room</button>
      <div>
        <input 
          type="text" 
          placeholder="Enter room ID to join" 
          value={roomId} 
          onChange={(e) => setRoomId(e.target.value)} 
        />
        <button onClick={handleJoinRoom}>Join Room</button>
      </div>
    </div>
  );
};

export default Homepage;
