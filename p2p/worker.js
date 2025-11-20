// --- Cloudflare Durable Object Class (The 'Room') ---

/**
 * The Durable Object that maintains the state and manages all WebSocket connections
 * for a single unique room (identified by the URL path).
 */
export class Room {
  /** @type {DurableObjectState} */
  state;
  /** @type {Set<WebSocket>} */
  sessions = new Set();
  /** @type {number} */
  sessionCounter = 0;

  /**
   * @param {DurableObjectState} state
   * @param {any} env - The Worker environment bindings (not strictly used here, but required).
   */
  constructor(state, env) {
    this.state = state;
  }

  /**
   * Handles incoming HTTP and WebSocket requests for this Durable Object instance.
   * The client (React Hook) hits this via the main Worker's fetch() handler.
   * * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");

    // 1. Handle WebSocket Upgrade Request
    if (upgradeHeader === "websocket") {
      // Create a WebSocketPair, which gives us two WebSockets:
      // the client-facing one, and the Durable Object server-side one.
      /** @type {WebSocketPair} */
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept the connection on the server-side WebSocket
      server.accept();

      // Store the session and set up listeners
      this.handleSession(server);

      // Return the client-side WebSocket to the worker/runtime,
      // which will pass it back to the client.
      return new Response(null, { status: 101, webSocket: client });
    }

    // 2. Handle standard HTTP requests (e.g., for debug or status)
    return new Response("Expected a WebSocket Upgrade request.", {
      status: 400,
    });
  }

  /**
   * Sets up event listeners for a new WebSocket connection and adds it to the sessions pool.
   * @param {WebSocket} ws
   */
  handleSession(ws) {
    // Assign a simple ID for tracking
    const sessionId = this.sessionCounter++;
    ws.id = sessionId;
    this.sessions.add(ws);

    console.log(
      `[DO ${this.state.id.name}] New connection: ID ${sessionId}. Total: ${this.sessions.size}`
    );

    // --- Event Listeners ---

    // 1. Handle incoming messages from the client
    ws.addEventListener("message", (event) => {
      /** @type {string} */
      const messageString = event.data;
      let message;

      try {
        message = JSON.parse(messageString);
      } catch (e) {
        console.error(
          `[DO] Invalid JSON received from client ${sessionId}: ${messageString}`
        );
        return;
      }

      // The client message structure is: { type: string, payload: any, roomId: string }
      if (message && message.type) {
        // Handle system messages
        if (message.type === "sys:identify") {
          ws.userData = message.payload;
          console.log(
            `[DO] Client ${sessionId} identified as`,
            message.payload
          );
        }

        console.log(
          `[DO] Received event '${message.type}' from ${sessionId}. Broadcasting...`
        );

        // Broadcast the message to all *other* sessions in the room
        this.broadcast(messageString, ws);
      } else {
        console.log(`[DO] Received malformed message from ${sessionId}.`);
      }
    });

    // 2. Handle connection closure
    ws.addEventListener("close", (event) => {
      this.sessions.delete(ws);
      console.log(
        `[DO] Connection closed: ID ${sessionId}. Total: ${this.sessions.size}`
      );

      if (ws.userData) {
        this.broadcast(
          JSON.stringify({
            type: "player_leave",
            payload: ws.userData,
          })
        );
      }
    });

    // 3. Handle connection error
    ws.addEventListener("error", (err) => {
      console.error(`[DO] WebSocket error for ID ${sessionId}:`, err);
      this.sessions.delete(ws);
    });
  }

  /**
   * Sends a message string to all active sessions except the sender (optional).
   * @param {string} message - The JSON string to send.
   * @param {WebSocket} [sender=null] - The session that sent the original message (to avoid echo).
   */
  broadcast(message, sender = null) {
    this.sessions.forEach((session) => {
      // Do not send the message back to the sender
      if (session !== sender) {
        try {
          session.send(message);
        } catch (e) {
          console.error("[DO] Failed to send message to session. Closing.", e);
          session.close(1011, "Failed to send message.");
          this.sessions.delete(session);
        }
      }
    });
  }
}

// --- Cloudflare Worker Entry Point (The Router) ---

export default {
  /**
   * @param {Request} request
   * @param {any} env - The Worker environment bindings. Must contain a 'ROOMS' binding.
   * @param {any} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Check for the multiplayer room endpoint prefix '/room'
    if (url.pathname.startsWith("/room")) {
      // The room ID is everything after the '/room' prefix
      // e.g., for /room/my-app/page, roomId is /my-app/page
      const roomId = url.pathname.substring(5);

      if (!roomId || roomId === "/") {
        return new Response(
          "Room ID derived from URL path is required after /room.",
          { status: 400 }
        );
      }

      // 2. Get the Durable Object stub for the given room ID
      // The binding name 'ROOMS' must match the configuration in wrangler.toml
      const id = env.ROOMS.idFromName(roomId);
      const stub = env.ROOMS.get(id);

      // 3. Forward the request to the Durable Object
      // The DO will handle the WebSocket upgrade logic
      return stub.fetch(request);
    }

    // 4. Default response for other paths
    return new Response(
      "Welcome to the Multiplayer Worker. Append /room/{your-url-path} to connect a WebSocket.",
      { status: 200 }
    );
  },
};
