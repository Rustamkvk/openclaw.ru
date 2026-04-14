const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:8090';
const NODE_NAME = process.env.NODE_NAME || 'mac-mini-01';
const SHARED_TOKEN = process.env.WS_SHARED_TOKEN || 'change-me';
const API_BASE = process.env.API_BASE || 'http://localhost:8000/api';

let ws = null;
let heartbeatInterval = null;
let pollInterval = null;
const pendingQueue = [];

function connect() {
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'auth', token: SHARED_TOKEN, nodeName: NODE_NAME }));
  });

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'auth_ok') {
      startHeartbeat();
      startPollingFallback();
      flushQueue();
    }
  });

  ws.on('error', () => {});
  ws.on('close', () => {
    stopTimers();
    setTimeout(connect, 3000);
  });
}

function sendEvent(eventType, payload) {
  const packet = { type: 'event', eventType, payload };
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(packet));
  } else {
    pendingQueue.push(packet);
  }
}

function flushQueue() {
  while (pendingQueue.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(pendingQueue.shift()));
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        nodeType: 'mac-mini',
        meta: { source: 'mac-mini' },
      }));
    }
  }, 60000);
}

function startPollingFallback() {
  stopPolling();
  pollInterval = setInterval(async () => {
    try {
      const url = `${API_BASE}/agent/poll?node_name=${encodeURIComponent(NODE_NAME)}`;
      await fetch(url);
    } catch (error) {
      // polling fallback failure is tolerated
    }
  }, 60000);
}

function stopHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
}

function stopPolling() {
  if (pollInterval) clearInterval(pollInterval);
}

function stopTimers() {
  stopHeartbeat();
  stopPolling();
}

connect();

setInterval(() => {
  sendEvent('status_report', { ok: true, at: new Date().toISOString() });
}, 120000);
