import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Video, PhoneOff } from 'lucide-react';

const VideoConference = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [peers, setPeers] = useState<any[]>([]);
    const socketRef = useRef<any>();
    const userVideo = useRef<HTMLVideoElement>(null);
    const peersRef = useRef<any[]>([]);

    useEffect(() => {
        socketRef.current = io('http://127.0.0.1:8787');

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            }

            socketRef.current.emit('join room', roomId);

            socketRef.current.on('all users', (users: any[]) => {
                const peers: any[] = [];
                users.forEach((userID: string) => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    });
                    peers.push(peer);
                });
                setPeers(peers);
            });

            socketRef.current.on('user joined', (payload: any) => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                });

                setPeers((users) => [...users, peer]);
            });

            socketRef.current.on('receiving returned signal', (payload: any) => {
                const item = peersRef.current.find((p) => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        });
    }, [roomId]);

    function createPeer(userToSignal: string, callerID: string, stream: MediaStream) {
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302',
                },
            ],
        });

        stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('sending signal', {
                    userToSignal,
                    callerID,
                    signal: event.candidate,
                });
            }
        };

        return peer;
    }

    function addPeer(incomingSignal: any, callerID: string, stream: MediaStream) {
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302',
                },
            ],
        });

        stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('returning signal', {
                    signal: event.candidate,
                    callerID,
                });
            }
        };

        (peer as any).signal(incomingSignal);

        return peer;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
            <header className="bg-gray-800 p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-cyan-400">LiveLink Video Conference</h1>
                <div>
                    <button className="p-2 bg-red-500 rounded-full">
                        <PhoneOff className="text-white" />
                    </button>
                </div>
            </header>
            <main className="flex-grow flex flex-wrap justify-center items-center p-4">
                <video ref={userVideo} autoPlay muted className="w-1/3 rounded-md shadow-lg mb-4"></video>
                {peers.map((_, index) => (
                    <Video key={index} className="w-1/3 rounded-md shadow-lg mb-4" />
                ))}
            </main>
        </div>
    );
};

export default VideoConference;
