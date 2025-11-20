import React, { useState, useEffect, useRef } from "react";
import styles from "./P2p.module.css";
import { registerVevComponent } from "@vev/react";
import { useMultiplayerRoom } from "./hooks/useMultiplayerRoom";

type Props = {
  title: string;
};

const P2p = ({ title = "Vev" }: Props) => {
  // Replace with your actual Cloudflare Worker URL
  const WORKER_URL = "https://multiplayer-room-worker.baard-44e.workers.dev";

  // The hook connects and manages the room
  const { isConnected, roomId, sendEvent, onEvent } =
    useMultiplayerRoom(WORKER_URL);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const latestMessagesRef = useRef(messages);

  // Update ref whenever messages state changes
  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  // Set up event listeners on mount
  useEffect(() => {
    if (!isConnected) return;

    // Listener for incoming chat messages
    const cleanupChat = onEvent("chat_message", (payload) => {
      console.log("Received chat message payload:", payload);
      setMessages((prevMessages) => [...prevMessages, payload]);
    });

    // Listener for a generic "User Joined" event
    const cleanupJoin = onEvent("user_joined", (payload) => {
      console.log(`${payload.userId} joined the room.`);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `${payload.userId} has joined!`, sender: "System" },
      ]);
    });

    // Send a join event once connected (if you want to notify others)
    sendEvent("user_joined", {
      userId: "User-" + Math.random().toString(36).substring(2, 6),
    });

    // The returned function handles cleanup
    return () => {
      cleanupChat();
      cleanupJoin();
    };
  }, [isConnected, onEvent, sendEvent]); // Dependencies include hook functions

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && isConnected) {
      const messagePayload = {
        text: input.trim(),
        sender: "Me",
        timestamp: new Date().toLocaleTimeString(),
      };

      // Send the message event
      sendEvent("chat_message", messagePayload);

      // Immediately update local state to reflect the sent message
      setMessages((prevMessages) => [...prevMessages, messagePayload]);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-inter">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`
            .font-inter { font-family: 'Inter', sans-serif; }
        `}</style>

      <div className="w-full max-w-xl bg-white shadow-xl rounded-xl p-6 space-y-4 md:space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center">
          Multiplayer Room Demo
        </h1>
        <div
          className="text-sm font-medium p-3 rounded-lg flex flex-col md:flex-row justify-between items-center"
          style={{
            backgroundColor: isConnected ? "#D1FAE5" : "#FEE2E2",
            color: isConnected ? "#065F46" : "#991B1B",
          }}
        >
          <span>
            Room ID:{" "}
            <span className="font-mono bg-white p-1 rounded text-xs md:text-sm shadow-inner">
              {roomId || "Loading..."}
            </span>
          </span>
          <span className="mt-2 md:mt-0">
            Status:{" "}
            <span className="font-bold">
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </span>
          </span>
        </div>

        {/* Message Log */}
        <div className="h-96 border border-gray-200 bg-gray-50 p-4 rounded-lg overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic text-center pt-8">
              {isConnected ? "Start the conversation!" : "Connecting..."}
            </p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "Me"
                    ? "justify-end"
                    : msg.sender === "System"
                    ? "justify-center"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md text-sm ${
                    msg.sender === "Me"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : msg.sender === "System"
                      ? "bg-gray-200 text-gray-600 italic text-center"
                      : "bg-white text-gray-800 border border-gray-300 rounded-tl-none"
                  }`}
                >
                  {msg.sender !== "Me" && msg.sender !== "System" && (
                    <div className="font-semibold text-xs mb-1">
                      {msg.sender}
                    </div>
                  )}
                  {msg.text}
                  {msg.timestamp && msg.sender === "Me" && (
                    <div className="text-right text-xs mt-1 opacity-70">
                      {msg.timestamp}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isConnected ? "Type a message..." : "Awaiting connection..."
            }
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 disabled:bg-gray-100"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || input.trim() === ""}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150 disabled:bg-blue-300"
          >
            Send
          </button>
        </form>
      </div>

      <p className="mt-6 text-sm text-gray-500 max-w-xl text-center">
        **Note:** This demo requires a Cloudflare Durable Object deployed at{" "}
        <span className="font-mono">{WORKER_URL}</span> that listens for{" "}
        <span className="font-mono">/room/{"{ROOM_ID}"}</span> and relays JSON
        messages.
      </p>
    </div>
  );
};

registerVevComponent(P2p, {
  name: "P2p",
  props: [{ name: "title", type: "string", initialValue: "Vev" }],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: "standard",
});

export default P2p;
