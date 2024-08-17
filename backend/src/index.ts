import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

// This object will store rooms with an array of participants (WebSockets)
const rooms: Record<string, { sender: WebSocket | null; receiver: WebSocket | null }> = {};

wss.on("connection", function connection(ws) {
    let roomId: string;

    ws.on("error", function error(err) {
        console.log(err);
    });

    ws.on("message", function message(data: any) {
        const message = JSON.parse(data);

        if (message.type === "join") {
            roomId = message.roomId;
            
            // Initialize the room if it doesn't exist
            if (!rooms[roomId]) {
                rooms[roomId] = { sender: null, receiver: null };
            }

            // Assign the socket to the correct role in the room
            if (message.role === "sender") {
                rooms[roomId].sender = ws;
                console.log(`Sender joined room ${roomId}`);
            } else if (message.role === "receiver") {
                rooms[roomId].receiver = ws;
                console.log(`Receiver joined room ${roomId}`);
            }

        } else if (message.type === "sender-offer") {
            const receiver = rooms[roomId]?.receiver;
            if (receiver && ws === rooms[roomId].sender) {
                console.log("Sending offer to receiver");
                receiver.send(JSON.stringify({ type: "sender-offer", sdp: message.sdp }));
            }

        } else if (message.type === "create-answer") {
            const sender = rooms[roomId]?.sender;
            if (sender && ws === rooms[roomId].receiver) {
                console.log("Sending answer to sender");
                sender.send(JSON.stringify({ type: "create-answer", sdp: message.sdp }));
            }

        } else if (message.type === "ice-candidate") {
            const peer = message.role === "sender" ? rooms[roomId]?.receiver : rooms[roomId]?.sender;
            if (peer) {
                console.log("Sending ICE candidate to peer");
                peer.send(JSON.stringify({ type: "ice-candidate", candidate: message.candidate }));
            }
        }
    });

    ws.on("close", () => {
        // Remove the socket from the room on disconnect
        if (rooms[roomId]) {
            if (rooms[roomId].sender === ws) {
                rooms[roomId].sender = null;
            } else if (rooms[roomId].receiver === ws) {
                rooms[roomId].receiver = null;
            }

            // Clean up the room if both participants have left
            if (!rooms[roomId].sender && !rooms[roomId].receiver) {
                delete rooms[roomId];
                console.log(`Room ${roomId} cleaned up`);
            }
        }
    });
});

console.log("WebSocket server is running on ws://localhost:8080");



// import { WebSocket, WebSocketServer } from "ws";

// const wss = new WebSocketServer({ port: 8080 });

// let senderSocket: WebSocket | null = null;
// let receiverSocket: WebSocket | null = null;

// wss.on("connection", function connection(ws) {
//     let roomId: string;

//     ws.on("error", function error(err) {
//         console.log(err);
//     });

//     ws.on("message", function message(data: any) {
//         const message = JSON.parse(data);

//         if (message.type === "join") {
//             roomId = message.roomId;
//             if (message.role === "sender") {
//                 senderSocket = ws;
//                 console.log("Sender joined the room:", roomId);
//             } else {
//                 receiverSocket = ws;
//                 console.log("Receiver joined the room:", roomId);
//             }
//         } else if (message.type === "sender-offer") {
//             if (ws !== senderSocket || !receiverSocket) {
//                 return;
//             }
//             console.log("Sending offer to receiver");
//             receiverSocket.send(JSON.stringify({ type: "sender-offer", sdp: message.sdp }));
//         } else if (message.type === "create-answer") {
//             if (!senderSocket || ws !== receiverSocket) {
//                 return;
//             }
//             console.log("Sending answer to sender");
//             senderSocket.send(JSON.stringify({ type: "create-answer", sdp: message.sdp }));
//         } else if (message.type === "ice-candidate") {
//             if (message.role === "sender" && receiverSocket) {
//                 console.log("Sending ICE candidate to receiver");
//                 receiverSocket.send(JSON.stringify({ type: "ice-candidate", candidate: message.candidate }));
//             } else if (message.role === "receiver" && senderSocket) {
//                 console.log("Sending ICE candidate to sender");
//                 senderSocket.send(JSON.stringify({ type: "ice-candidate", candidate: message.candidate }));
//             }
//         }
//     });
// });

// console.log("WebSocket server is running on ws://localhost:8080");
