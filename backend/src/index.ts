import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import url from 'url';

// Extend WebSocket to include the isAlive property
interface WebSocketWithAlive extends WebSocket {
    isAlive?: boolean;
}

const rooms: Record<string, { sender: WebSocketWithAlive | null; receiver: WebSocketWithAlive | null }> = {};

// Create HTTP server
const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*"); // Adjust this for production
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === 'OPTIONS') {
        res.writeHead(204); // Respond to preflight request with no content
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url!, true);
    const path = parsedUrl.pathname;

    if (path?.startsWith("/room/") && path.endsWith("/status")) {
        const roomId = path.split("/")[2]; // Extract roomId from the URL

        if (rooms[roomId]) {
            const room = rooms[roomId];
            const status = {
                senderConnected: !!room.sender,
                receiverConnected: !!room.receiver
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Room not found' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Mechanism to check if the connection is alive
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        const client = ws as WebSocketWithAlive;
        if (!client.isAlive) return client.terminate();

        client.isAlive = false;
        client.ping();
    });
}, 30000);

wss.on("connection", function connection(ws) {
    const client = ws as WebSocketWithAlive;
    client.isAlive = true;

    client.on("pong", () => {
        client.isAlive = true;
    });

    let roomId: string;

    client.on("error", function error(err) {
        console.error("WebSocket error:", err);
    });

    client.on("message", function message(data: any) {
        const message = JSON.parse(data);
        console.log("Received message:", message);

        if (message.type === "join") {
            roomId = message.roomId;

            if (!rooms[roomId]) {
                rooms[roomId] = { sender: null, receiver: null };
            }

            if (message.role === "sender") {
                rooms[roomId].sender = client;
            } else if (message.role === "receiver") {
                rooms[roomId].receiver = client;
            }

            // Notify both participants of connection status
            if (rooms[roomId].sender && rooms[roomId].receiver) {
                rooms[roomId].sender?.send(JSON.stringify({ type: "status", message: "Receiver connected" }));
                rooms[roomId].receiver?.send(JSON.stringify({ type: "status", message: "Connected to sender" }));
            }
        }
    });

    client.on("close", () => {
        if (rooms[roomId]) {
            if (rooms[roomId].sender === client) {
                rooms[roomId].sender = null;
            } else if (rooms[roomId].receiver === client) {
                rooms[roomId].receiver = null;
            }

            if (!rooms[roomId].sender && !rooms[roomId].receiver) {
                delete rooms[roomId];
            }
        }
    });
});

// Start both the HTTP and WebSocket servers
server.listen(8080, () => {
    console.log("Server and WebSocket are running on http://localhost:8080"); 
});
