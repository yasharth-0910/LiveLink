/*
    <section className="w-full md:w-1/3 lg:w-1/4 bg-gray-800/50 rounded-lg flex flex-col overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg, index) => (
                <div key={index} className="mb-2">
                    {msg}
                </div>
                ))}
            </div>
            <div className="p-4 bg-gray-900/70 border-t border-gray-700 flex items-center space-x-2">
                <input 
                ref={chatInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="w-full p-2 bg-gray-800 rounded-lg text-gray-100"
                />
                <button onClick={sendMessage} className="p-2 bg-cyan-400 rounded-lg hover:bg-cyan-500 transition-colors">
                <Send className="h-5 w-5 text-white" />
                </button>
            </div>
            </section>
*/

/*
  const sendMessage = () => {
    if (newMessage.trim() && webSocket) {
      webSocket.send(JSON.stringify({ type: "chat-message", message: newMessage }));
      setMessages((prevMessages) => [...prevMessages, `You: ${newMessage}`]);
      setNewMessage("");
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }
  };




  ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log("Received message:", data);
      if (data.type === "status" && data.message === "Receiver connected") {
        setStatus("Receiver connected! Setting up connection...");
        createOffer();
      } else if (data.type === "create-answer") {
        peerConnection?.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "ice-candidate" && data.candidate) {
        peerConnection?.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else if (data.type === "chat-message") {
        setMessages((prevMessages) => [...prevMessages, `Receiver: ${data.message}`]);
      }
    };


    const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState("");
  */