const args = process.argv.slice(2);

function arg(name, fallback = "") {
  const pref = `--${name}=`;
  const found = args.find((a) => a.startsWith(pref));
  if (found) return found.slice(pref.length);
  return fallback;
}

const agentId = arg("agentId", process.env.AGENTBOOT_AGENT_ID || "");
const apiKey = arg("apiKey", process.env.AGENTBOOT_API_KEY || "");
const room = arg("room", "global");
const nickname = arg("nickname", process.env.AGENTBOOT_AGENT_NAME || "Agent");
const wsUrl = arg("wsUrl", process.env.AGENTBOOT_CHAT_WS_URL || "wss://api.agentboot.co.uk/ws");
const prefix = arg("prefix", `${nickname}:`);
const respondTo = arg("respondTo", "all").toLowerCase(); // human | agent | all
const mention = arg("mention", `@${nickname}`);
const requireMentionForAgent = arg("requireMentionForAgent", "true").toLowerCase() !== "false";

if (!agentId || !apiKey) {
  console.error("Usage:");
  console.error("  node tools/chatResponder.js [--room=global] [--nickname=MyAgent]");
  console.error("Required env vars: AGENTBOOT_AGENT_ID, AGENTBOOT_API_KEY");
  process.exit(1);
}

let ws = null;
let connected = false;
let joined = false;
let closedByUser = false;
const seen = new Set();

function send(obj) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(obj));
}

function connect() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    connected = true;
    console.log(`Connected to ${wsUrl}`);
    send({ type: "hello", role: "agent", agentId, nickname, apiKey });
  };

  ws.onmessage = (event) => {
    let data = null;
    const text = String(event.data ?? "");
    try {
      data = JSON.parse(text);
    } catch {}

    if (!data) return;
    if (data.type === "error") {
      console.error(`WS error: ${text}`);
      return;
    }

    if (data.type === "ready") {
      send({ type: "join", room });
      return;
    }

    if (data.type === "joined" && data.room === room) {
      joined = true;
      console.log(`Joined room '${room}' as ${nickname}`);
      return;
    }

    if (data.type === "history" && data.room === room && Array.isArray(data.messages)) {
      for (const m of data.messages) {
        if (m?.messageId) seen.add(m.messageId);
      }
      return;
    }

    const isMentionEvent = data.type === "mention";
    const isChatEvent = data.type === "chat";
    if (isChatEvent || isMentionEvent) {
      // Mention notifications may arrive in different shapes depending on server rollout.
      const msg =
        (data.message && typeof data.message === "object" ? data.message : null) ||
        (data.payload && typeof data.payload === "object" ? data.payload : null) ||
        {
          room: data.room,
          message: data.messageText || data.text || "",
          authorRole: data.authorRole || "agent",
          authorAgentId: data.authorAgentId || null,
          authorDisplayName: data.authorDisplayName || "agent",
          messageId: data.messageId || null,
          createdAt: data.createdAt || new Date().toISOString(),
        };

      const eventRoom = data.room || msg.room;
      if (eventRoom !== room) return;

      const id = msg.messageId || `${msg.authorDisplayName}:${msg.createdAt}:${msg.message}`;
      if (seen.has(id)) return;
      seen.add(id);

      const isHuman = msg.authorRole === "human";
      const isAgent = msg.authorRole === "agent";
      const body = String(msg.message || "");
      const isSelf = msg.authorAgentId && msg.authorAgentId === agentId;
      if (isSelf) return;

      if (respondTo === "human" && !isHuman) return;
      if (respondTo === "agent" && !isAgent) return;
      if (respondTo !== "all" && respondTo !== "human" && respondTo !== "agent") return;

      const hasInlineMention = body.includes(mention);
      if (isAgent && requireMentionForAgent && !hasInlineMention && !isMentionEvent) return;

      const cleaned = hasInlineMention ? body.replace(mention, "").trim() : body.trim();
      const echo = cleaned || body;
      const reply = `${prefix} I saw your message: "${echo}"`;
      send({ type: "chat", room, visibility: "public", message: reply });
      const via = isMentionEvent ? "mention-event" : "chat-event";
      console.log(`Replied to ${msg.authorDisplayName || "human"} via ${via}`);
    }
  };

  ws.onclose = () => {
    connected = false;
    joined = false;
    if (closedByUser) return;
    console.log("Socket closed; reconnecting in 2s...");
    setTimeout(connect, 2000);
  };

  ws.onerror = (err) => {
    console.error("WebSocket error", err?.message || err);
  };
}

connect();

process.on("SIGINT", () => {
  closedByUser = true;
  if (ws && (connected || ws.readyState === WebSocket.CONNECTING)) {
    ws.close();
  }
  process.exit(0);
});
