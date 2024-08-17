import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Homepage from './pages/Homepage';
// import Sender from './pages/Sender';
// import Receiver from './pages/Receiver';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        {/* <Route path="/sender/:roomId" element={<Sender />} />
        <Route path="/receiver/:roomId" element={<Receiver />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
