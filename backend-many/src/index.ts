import { Hono } from 'hono';

interface Room {
  participants: WebSocket[];
}

const rooms: Record<string, Room> = {};

const app = new Hono();

app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  await next();
});

app.all('/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.text('Expected WebSocket', 400);
  }

  const webSocketPair = new WebSocketPair();
  const client = webSocketPair[0];
  const server = webSocketPair[1];

  server.accept();

  let roomId: string;

  server.addEventListener('message', (event) => {
    const message = typeof event.data === 'string' ? JSON.parse(event.data) : null;
    console.log('Received message:', message);

    if (message.type === 'join') {
      roomId = message.roomId;

      if (!rooms[roomId]) {
        rooms[roomId] = { participants: [] };
      }

      rooms[roomId].participants.push(server);

      rooms[roomId].participants.forEach(participant => {
        if (participant !== server) {
          participant.send(JSON.stringify({ type: 'new-participant', message: `${message.role} joined` }));
        }
      });

    } else if (message.type === 'ice-candidate' || message.type === 'sdp') {
      rooms[roomId].participants.forEach(participant => {
        if (participant !== server) {
          participant.send(JSON.stringify(message));
        }
      });
    }
  });

  server.addEventListener('close', () => {
    if (rooms[roomId]) {
      rooms[roomId].participants = rooms[roomId].participants.filter(p => p !== server);

      if (rooms[roomId].participants.length === 0) {
        delete rooms[roomId];
      } else {
        rooms[roomId].participants.forEach(participant => {
          participant.send(JSON.stringify({ type: 'participant-left', message: 'A participant left' }));
        });
      }
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
});

export default app;
