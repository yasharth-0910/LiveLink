import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Users } from "lucide-react";
import Loader from '../components/Loader';

export default function Component() {
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartRoom = () => {
    setLoading(true);
    const newRoomId = Math.random().toString(36).substring(2, 10);
    setTimeout(() => {
      setLoading(false);
      navigate(`/sender/${newRoomId}`);
    }, 2000); // 2-second delay for loader
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        navigate(`/receiver/${roomId}`);
      }, 2000); // 2-second delay for loader
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-2xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold flex items-center justify-center gap-2 text-indigo-400">
              <Video className="h-8 w-8 text-indigo-500" />
              LiveLink
            </h1>
            <p className="text-gray-400">Connect with anyone, anywhere</p>
          </div>
          <div className="space-y-4">
            <button 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-110 shadow-lg"
              onClick={handleStartRoom}
            >
              Start Room
            </button>
            <div className="space-y-2">
              <input
                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400 transition-all duration-300"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <button 
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center justify-center disabled:opacity-50 shadow-lg"
                onClick={handleJoinRoom}
                disabled={!roomId}
              >
                <Users className="mr-2 h-5 w-5" />
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-sm text-gray-500 p-4">
        © 2024 LiveLink. All rights reserved. (Some functionality might not be fully operational as the site is in development)
      </footer>
    </div>
  );
}
