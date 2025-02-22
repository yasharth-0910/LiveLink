import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

const rooms: Record<string, { sender: string | null; receiver: string | null }> = {};

app.use(cors());

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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

const PORT = 8787;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});