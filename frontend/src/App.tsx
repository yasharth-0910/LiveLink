import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import  Start from './pages/Start';
import Homepage from './pages/Homepage';
import Sender from './pages/Sender';
import Receiver from './pages/Receiver';
import Contact from './pages/Contact';
import "./index.css";
import Pricing from './pages/Pricing';
import VideoConference from './pages/VideoConference';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/start" element={<Start />} />
        <Route path="/" element={<Homepage />} />
        <Route path="/sender/:roomId" element={<Sender />} />
        <Route path="/receiver/:roomId" element={<Receiver />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/price" element={<Pricing />} />
        <Route path="/video-conference/:roomId" element={<VideoConference />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
