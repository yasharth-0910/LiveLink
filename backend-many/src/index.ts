// import { Hono } from "hono";

// interface Room {
//   sender: WebSocket | null;
//   receivers: WebSocket[] | null;
// }

// const rooms: Record<string, Room> = {};

// const app = new Hono();

// // Middleware to handle CORS
// app.use('*', async (c, next) => {
//   c.header('Access-Control-Allow-Origin', '*');
//   c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   c.header('Access-Control-Allow-Headers', 'Content-Type');
//   await next();
// });

// //Check Status of Room

// app.get("/room/:roomId/status", (c) => {
//   const roomId = c.req.param("roomId");
//   const room = rooms[roomId];

//   if (room) {
//     return c.json({
//       senderConnected: !!room.sender,
//       receiverConnected: !!room.receiver,
//     });
//   } else {
//     return c.json({ error: "Room not found" }, 404);
//   }
// });

// app.all("/w", async (c)=>{

//   const webSocketPair = new WebSocketPair();

//   const client = webSocketPair[0];
//   const server = webSocketPair[1];

//   server.accept();

//   let roomId: string;



// })