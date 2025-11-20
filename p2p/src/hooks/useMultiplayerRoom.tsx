import React, { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom React Hook for connecting to a real-time room defined by the current URL path.
 *
 * It establishes a WebSocket connection to a server endpoint (expected to be a Cloudflare Durable Object)
 * using the current window pathname (e.g., '/my-app/room-123') as the room identifier.
 *
 * @param {string} endpointUrl - The base URL of the WebSocket server (e.g., 'wss://your-worker.com').
 * @returns {{
 * isConnected: boolean,
 * roomId: string,
 * sendEvent: (type: string, payload: any) => void,
 * onEvent: (type: string, callback: (payload: any) => void) => () => void
 * }}
 */
export const useMultiplayerRoom = (endpointUrl, roomIdOverride) => {
  // Determine the room ID from the current URL path
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    if (roomIdOverride) {
      setRoomId(roomIdOverride);
      return;
    }

    let id = window.location.pathname.replace(/\/$/, "");
    if (window.location.href === "about:srcdoc") {
      try {
        const url = new URL(document.referrer);
        id = url.pathname.replace(/\/$/, "");
      } catch (e) {
        console.warn(
          "[MP] Could not resolve room ID from referrer in srcdoc",
          e
        );
      }
    }
    setRoomId(id);
  }, [roomIdOverride]);

  // State for connection status
  const [isConnected, setIsConnected] = useState(false);

  // Ref to hold the WebSocket instance
  const wsRef = useRef(null);

  // Ref to hold the event listener map: { 'event_type': [callback1, callback2, ...] }
  const listenersRef = useRef(new Map());

  // --- Core Connection Logic ---
  useEffect(() => {
    if (!roomId || !endpointUrl) return;

    // Construct the full WebSocket URL, using the pathname as the room identifier
    // e.g., wss://your-worker.com/room/my-app/page-name
    const wsUrl = `${endpointUrl.replace("http", "ws")}/room${roomId}`;

    console.log(`[MP] Attempting to connect to room: ${roomId} at ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[MP] WebSocket connected successfully.");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message && message.type) {
          // Check if there are listeners for this event type
          const callbacks = listenersRef.current.get(message.type);
          if (callbacks) {
            // Execute all registered callbacks for this event
            callbacks.forEach((callback) => callback(message.payload));
          }
        }
      } catch (error) {
        console.error(
          "[MP] Error parsing incoming message:",
          error,
          event.data
        );
      }
    };

    ws.onclose = (event) => {
      console.log("[MP] WebSocket disconnected.", event);
      setIsConnected(false);
      // Optional: Implement reconnection logic here if needed
    };

    ws.onerror = (error) => {
      console.error("[MP] WebSocket error:", error);
      // The onclose handler will usually fire shortly after onerror
    };

    // Cleanup function for when the component unmounts or dependencies change
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [endpointUrl, roomId]);

  // --- Function to Send Events ---
  const sendEvent = useCallback(
    (type, payload) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type, payload, roomId });
        wsRef.current.send(message);
        // console.log('[MP] Sent event:', type, payload);
      } else {
        console.warn("[MP] Cannot send event: WebSocket is not open.");
      }
    },
    [roomId]
  );

  // --- Function to Register Listeners (the 'package' interface) ---
  const onEvent = useCallback((type, callback) => {
    // 1. Get the current list of callbacks for this event type
    const callbacks = listenersRef.current.get(type) || [];

    // 2. Add the new callback
    callbacks.push(callback);
    listenersRef.current.set(type, callbacks);

    // 3. Return a cleanup function to remove the listener
    return () => {
      const currentCallbacks = listenersRef.current.get(type);
      if (currentCallbacks) {
        const index = currentCallbacks.indexOf(callback);
        if (index > -1) {
          currentCallbacks.splice(index, 1);
        }
        // If the list is empty, we can clean up the map entry
        if (currentCallbacks.length === 0) {
          listenersRef.current.delete(type);
        }
      }
    };
  }, []);

  return {
    isConnected,
    roomId,
    sendEvent,
    onEvent,
  };
};
