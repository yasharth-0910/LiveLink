import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

interface Room {
  sender: string | null;
  receiver: string | null;
}

const rooms: Record<string, Room> = {};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware to handle CORS
app.use(cors());

// Endpoint to check room status
app.get('/room/:roomId/status', (req: Request, res: Response) => {
  const roomId = req.params.roomId;
  const room = rooms[roomId];

  if (room) {
    res.json({
      senderConnected: !!room.sender,
      receiverConnected: !!room.receiver,
    });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// Socket.IO handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', ({ roomId, role }) => {
    console.log(`User ${socket.id} joined room ${roomId} as ${role}`);

    if (!rooms[roomId]) {
      rooms[roomId] = { sender: null, receiver: null };
    }

    if (role === 'sender') {
      rooms[roomId].sender = socket.id;
    } else if (role === 'receiver') {
      rooms[roomId].receiver = socket.id;
    }

    socket.join(roomId);

    if (rooms[roomId].sender && rooms[roomId].receiver) {
      io.to(rooms[roomId].sender).emit('status', { message: 'Receiver connected' });
      io.to(rooms[roomId].receiver).emit('status', { message: 'Connected to sender' });
    }
  });

  socket.on('ice-candidate', ({ roomId, candidate, role }) => {
    const targetRole = role === 'sender' ? 'receiver' : 'sender';
    const targetId = rooms[roomId]?.[targetRole];
    if (targetId) {
      io.to(targetId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('sdp', ({ roomId, sdp, role }) => {
    const targetRole = role === 'sender' ? 'receiver' : 'sender';
    const targetId = rooms[roomId]?.[targetRole];
    if (targetId) {
      io.to(targetId).emit('sdp', { sdp });
    }
  });

  socket.on('sender-offer', ({ roomId, sdp }) => {
    const receiverId = rooms[roomId]?.receiver;
    if (receiverId) {
      io.to(receiverId).emit('sender-offer', { sdp });
    } else {
      console.error('Receiver not connected for room:', roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.sender === socket.id) {
        room.sender = null;
      } else if (room.receiver === socket.id) {
        room.receiver = null;
      }

      if (!room.sender && !room.receiver) {
        delete rooms[roomId];
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});