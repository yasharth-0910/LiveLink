import { Hono } from 'hono';

interface Room {
  sender: WebSocket | null;
  receiver: WebSocket | null;
}

const rooms: Record<string, Room> = {};

const app = new Hono();

// Middleware to handle CORS
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  await next();
});

// Endpoint to check room status
app.get('/room/:roomId/status', (c) => {
  const roomId = c.req.param('roomId');
  const room = rooms[roomId];

  if (room) {
    return c.json({
      senderConnected: !!room.sender,
      receiverConnected: !!room.receiver,
    });
  } else {
    return c.json({ error: 'Room not found' }, 404);
  }
});

// WebSocket endpoint
app.all('/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.text('Expected WebSocket', 400);
  }

  const webSocketPair = new WebSocketPair();
  const client = webSocketPair[0];
  const server = webSocketPair[1];

  server.accept(); // Accept the WebSocket connection
  let roomId: string;

  // Handle incoming WebSocket messages
  server.addEventListener('message', async (event: MessageEvent) => {
    const message = typeof event.data === 'string' ? JSON.parse(event.data) : null;
    console.log('Received message:', message);

    if (message.type === 'join') {
      roomId = message.roomId;

      if (!rooms[roomId]) {
        rooms[roomId] = { sender: null, receiver: null };
      }

      if (message.role === 'sender') {
        rooms[roomId].sender = server;
      } else if (message.role === 'receiver') {
        rooms[roomId].receiver = server;
      }

      if (rooms[roomId].sender && rooms[roomId].receiver) {
        rooms[roomId].sender?.send(JSON.stringify({ type: 'status', message: 'Receiver connected' }));
        rooms[roomId].receiver?.send(JSON.stringify({ type: 'status', message: 'Connected to sender' }));
      }
    }

    if (message.type === 'ice-candidate') {
      const target = message.role === 'sender' ? rooms[roomId]?.receiver : rooms[roomId]?.sender;
      target?.send(JSON.stringify({ type: 'ice-candidate', candidate: message.candidate }));
    }

    if (message.type === 'sdp') {
      const target = message.role === 'sender' ? rooms[roomId]?.receiver : rooms[roomId]?.sender;
      target?.send(JSON.stringify({ type: 'sdp', sdp: message.sdp }));
    }
  });

  // Handle WebSocket connection close
  server.addEventListener('close', () => {
    if (rooms[roomId]) {
      if (rooms[roomId].sender === server) {
        rooms[roomId].sender = null;
      } else if (rooms[roomId].receiver === server) {
        rooms[roomId].receiver = null;
      }

      if (!rooms[roomId].sender && !rooms[roomId].receiver) {
        delete rooms[roomId];
      }
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
});

export default app;