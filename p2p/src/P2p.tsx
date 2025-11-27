import React, { useState, useEffect, useRef, useMemo } from "react";
import styles from "./P2p.module.css";
import {
  registerVevComponent,
  useVevEvent,
  useDispatchVevEvent,
} from "@vev/react";
import { useMultiplayerRoom } from "./hooks/useMultiplayerRoom";

const Events = {
  STATE_CHANGE: "onStateChange",
  PLAYER_JOIN: "onPlayerJoin",
  PLAYER_LEAVE: "onPlayerLeave",
  CUSTOM_EVENT: "onEvent",
};

const Interactions = {
  JOIN: "Join",
  CREATE_ROOM: "CreateRoom",
  SEND_EVENT: "sendEvent",
};

type Props = {
  title: string;
  workerUrl?: string;
  roomIdOverride?: string;
  initialState?: string; // JSON string
};

const P2p = ({
  title = "Vev Multiplayer",
  workerUrl = "https://multiplayer-room-worker.baard-44e.workers.dev",
  roomIdOverride,
  initialState,
}: Props) => {
  const dispatchVevEvent = useDispatchVevEvent();
  const [currentRoomId, setCurrentRoomId] = useState(roomIdOverride);

  // Sync prop changes to state, but allow internal overrides (from Join interaction)
  useEffect(() => {
    if (roomIdOverride) setCurrentRoomId(roomIdOverride);
  }, [roomIdOverride]);

  // Connect to the room
  const { isConnected, roomId, sendEvent, onEvent } = useMultiplayerRoom(
    workerUrl,
    currentRoomId
  );

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  // Generate a persistent user ID for this session
  const userId = useMemo(
    () => "User-" + Math.random().toString(36).substring(2, 6),
    []
  );

  // --- Vev Interactions ---

  useVevEvent(Interactions.JOIN, (code: string) => {
    if (code) setCurrentRoomId(code);
  });

  useVevEvent(Interactions.CREATE_ROOM, (code: string) => {
    if (code) setCurrentRoomId(code);
  });

  useVevEvent(
    Interactions.SEND_EVENT,
    (args?: { eventName?: string; data?: any }) => {
      if (!isConnected) return;
      const eventName = args?.eventName || "event";
      sendEvent("custom_event", {
        name: eventName,
        data: args?.data,
        sender: userId,
      });
    }
  );

  // --- Event Listeners ---

  useEffect(() => {
    if (!isConnected) return;

    // 1. Identify ourselves to the worker (so it can handle disconnects)
    sendEvent("sys:identify", { userId, label: userId });

    // 2. Announce join to other peers (client-side event)
    sendEvent("player_joined", { userId, label: userId });

    // 3. Listen for system/chat events

    // Player Joined
    const unsubJoin = onEvent("player_joined", (payload: any) => {
      dispatchVevEvent(Events.PLAYER_JOIN, { player: payload });
      setMessages((prev) => [
        ...prev,
        { text: `${payload.userId} joined`, sender: "System" },
      ]);
    });

    // Player Left (from Worker)
    const unsubLeave = onEvent("player_leave", (payload: any) => {
      dispatchVevEvent(Events.PLAYER_LEAVE, { playerId: payload.userId });
      setMessages((prev) => [
        ...prev,
        { text: `${payload.userId} left`, sender: "System" },
      ]);
    });

    // Custom Events
    const unsubCustom = onEvent("custom_event", (payload: any) => {
      dispatchVevEvent(Events.CUSTOM_EVENT, {
        name: payload.name,
        payload: payload.data,
        sender: { id: payload.sender },
      });
    });

    // State Change (if we implement state sync later)
    const unsubState = onEvent("state_change", (payload: any) => {
      dispatchVevEvent(Events.STATE_CHANGE, { state: payload });
    });

    // Chat messages (for the demo UI)
    const unsubChat = onEvent("chat_message", (payload: any) => {
      setMessages((prev) => [...prev, payload]);
    });

    return () => {
      unsubJoin();
      unsubLeave();
      unsubCustom();
      unsubState();
      unsubChat();
    };
  }, [isConnected, onEvent, sendEvent, dispatchVevEvent, userId]);

  // --- UI Logic ---

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isConnected) {
      const payload = {
        text: input.trim(),
        sender: "Me",
        timestamp: new Date().toLocaleTimeString(),
      };
      sendEvent("chat_message", payload);
      setMessages((prev) => [...prev, payload]);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-inter">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`.font-inter { font-family: 'Inter', sans-serif; }`}</style>

      <div className="w-full max-w-xl bg-white shadow-xl rounded-xl p-6 space-y-4 md:space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <div
            className={`px-2 py-1 rounded text-xs font-bold ${
              isConnected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isConnected ? "CONNECTED" : "DISCONNECTED"}
          </div>
        </div>

        <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
          Room: {roomId || "..."} <br />
          ID: {userId}
        </div>

        {/* Message Log */}
        <div className="h-64 border border-gray-200 bg-gray-50 p-4 rounded-lg overflow-y-auto space-y-2 text-sm">
          {messages.length === 0 ? (
            <p className="text-gray-400 italic text-center pt-8">
              No messages yet
            </p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "Me" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.sender === "Me"
                      ? "bg-blue-500 text-white"
                      : msg.sender === "System"
                      ? "bg-gray-200 text-gray-600 text-xs italic"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {msg.sender !== "Me" && msg.sender !== "System" && (
                    <div className="font-bold text-xs mb-1">{msg.sender}</div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send message..."
            className="flex-grow p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

registerVevComponent(P2p, {
  name: "P2p Multiplayer",
  props: [
    { name: "title", type: "string", initialValue: "Multiplayer Room" },
    {
      name: "roomIdOverride",
      type: "string",
      title: "Room ID (Optional)",
      description: "Leave empty to use URL path",
    },
    {
      name: "workerUrl",
      type: "string",
      title: "Worker URL",
      initialValue: "https://multiplayer-room-worker.baard-44e.workers.dev",
    },
  ],
  events: [
    {
      type: Events.STATE_CHANGE,
      description: "Game state changed",
      args: [{ name: "state", type: "object", fields: [] }],
    },
    {
      type: Events.PLAYER_JOIN,
      description: "Player joined",
      args: [
        {
          name: "player",
          type: "object",
          fields: [
            { name: "id", type: "string" },
            { name: "label", type: "string" },
          ],
        },
      ],
    },
    {
      type: Events.PLAYER_LEAVE,
      description: "Player left",
      args: [{ name: "playerId", type: "string" }],
    },
    {
      type: Events.CUSTOM_EVENT,
      description: "Custom event received",
      args: [
        { name: "name", type: "string" },
        {
          name: "payload",
          type: "object",
          fields: [{ name: "text", type: "string" }],
        },
        {
          name: "sender",
          type: "object",
          fields: [{ name: "id", type: "string" }],
        },
      ],
    },
  ],
  interactions: [
    {
      type: Interactions.JOIN,
      description: "Join a specific room code",
      args: [{ name: "code", type: "string" }],
    },
    {
      type: Interactions.CREATE_ROOM,
      description: "Create/Join a room (alias for Join)",
      args: [{ name: "code", type: "string" }],
    },
    {
      type: Interactions.SEND_EVENT,
      description: "Broadcast an event to the room",
      args: [
        { name: "eventName", type: "string" },
        {
          name: "data",
          type: "object",
          fields: [{ name: "text", type: "string" }],
        },
      ],
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: "standard",
});

export default P2p;
