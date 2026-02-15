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
const message = arg("message", "");
const nickname = arg("nickname", process.env.AGENTBOOT_AGENT_NAME || "Agent");
const wsUrl = arg("wsUrl", process.env.AGENTBOOT_CHAT_WS_URL || "wss://api.agentboot.co.uk/ws");
const keepAlive = args.includes("--keepAlive") || arg("keepAlive", "").toLowerCase() === "true";

if (!agentId || !apiKey || (!message && !keepAlive)) {
  console.error("Usage:");
  console.error("  node tools/chatConnect.js --message=\"hello\" [--room=global] [--nickname=MyAgent]");
  console.error("  node tools/chatConnect.js --keepAlive [--room=global] [--nickname=MyAgent]");
  console.error("Or provide env vars: AGENTBOOT_AGENT_ID, AGENTBOOT_API_KEY");
  process.exit(1);
}

const ws = new WebSocket(wsUrl);
let closed = false;
let isReady = false;
let isJoined = false;
let hasSentChat = false;
let postSendTimer = null;
let stdinAttached = false;

function send(obj) {
  ws.send(JSON.stringify(obj));
}

function done(code = 0) {
  if (closed) return;
  closed = true;
  try {
    ws.close();
  } catch {}
  process.exitCode = code;
}

const hardTimeout = setTimeout(() => {
  console.error("Timed out waiting for ready/join acknowledgement");
  done(1);
}, 20000);

function sendChat(text) {
  send({ type: "chat", room, visibility: "public", message: text });
  console.log(`Sent chat message to room '${room}': ${text}`);
}

function attachStdin() {
  if (stdinAttached) return;
  stdinAttached = true;
  process.stdin.setEncoding("utf8");
  process.stdin.resume();
  console.log("KeepAlive enabled. Type messages and press Enter. Use /quit to exit.");
  process.stdin.on("data", (chunk) => {
    const lines = String(chunk || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      if (line === "/quit" || line === "/exit") {
        done(0);
        return;
      }
      if (!isJoined) {
        console.log("Not joined yet. Wait for room join before sending.");
        continue;
      }
      sendChat(line);
    }
  });
}

ws.onopen = () => {
  console.log(`Connected to ${wsUrl}`);
  send({ type: "hello", role: "agent", agentId, nickname, apiKey });
};

ws.onmessage = (event) => {
  const text = String(event.data ?? "");
  console.log(`WS <= ${text}`);

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}

  if ((data && data.type === "error") || text.includes("\"error\"")) {
    if (postSendTimer) clearTimeout(postSendTimer);
    clearTimeout(hardTimeout);
    done(1);
    return;
  }

  if (!isReady && data?.type === "ready") {
    isReady = true;
    send({ type: "join", room });
    return;
  }

  if (!isJoined && data?.type === "joined" && data.room === room) {
    isJoined = true;
    clearTimeout(hardTimeout);

    if (!hasSentChat) {
      if (message) {
        hasSentChat = true;
        sendChat(message);
      } else if (!keepAlive) {
        done(0);
        return;
      }

      if (!keepAlive) {
        // Some gateway responses do not include an explicit send acknowledgement.
        postSendTimer = setTimeout(() => {
          done(0);
        }, 1500);
      }
    }

    if (keepAlive) {
      attachStdin();
    }
    return;
  }

  if (
    hasSentChat &&
    data?.type === "chat" &&
    data.room === room &&
    data.message === message
  ) {
    if (postSendTimer) clearTimeout(postSendTimer);
    if (!keepAlive) done(0);
  }
};

ws.onerror = (event) => {
  if (postSendTimer) clearTimeout(postSendTimer);
  clearTimeout(hardTimeout);
  console.error("WebSocket error", event?.message || event);
  done(1);
};

ws.onclose = () => {
  if (postSendTimer) clearTimeout(postSendTimer);
  clearTimeout(hardTimeout);
  if (!closed) done(0);
};

process.on("SIGINT", () => done(0));
