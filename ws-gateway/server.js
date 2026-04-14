const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.WS_PORT || 8090;
const API_BASE = process.env.API_BASE || 'http://localhost:8000/api';
const SHARED_TOKEN = process.env.WS_SHARED_TOKEN || 'change-me';
const RATE_LIMIT_PER_MINUTE = Number(process.env.WS_RATE_LIMIT_PER_MINUTE || 120);
const HEARTBEAT_TIMEOUT_MS = Number(process.env.WS_HEARTBEAT_TIMEOUT_MS || 180000);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', (ws) => {
  let nodeName = null;
  let minuteWindow = Date.now();
  let messageCount = 0;
  let lastHeartbeatAt = Date.now();

  const heartbeatWatcher = setInterval(() => {
    const staleFor = Date.now() - lastHeartbeatAt;
    if (nodeName && staleFor > HEARTBEAT_TIMEOUT_MS) {
      ws.send(JSON.stringify({ type: 'error', message: 'heartbeat_timeout' }));
      ws.terminate();
    }
  }, 30000);

  ws.on('message', async (raw) => {
    try {
      const now = Date.now();
      if (now - minuteWindow >= 60000) {
        minuteWindow = now;
        messageCount = 0;
      }
      messageCount += 1;
      if (messageCount > RATE_LIMIT_PER_MINUTE) {
        ws.send(JSON.stringify({ type: 'error', message: 'rate_limit' }));
        return;
      }

      const message = JSON.parse(raw.toString());
      if (message.type === 'auth') {
        if (message.token !== SHARED_TOKEN || !message.nodeName) {
          ws.send(JSON.stringify({ type: 'error', message: 'auth_failed' }));
          ws.close();
          return;
        }
        nodeName = message.nodeName;
        clients.set(nodeName, ws);
        ws.send(JSON.stringify({ type: 'auth_ok', nodeName }));
        return;
      }

      if (!nodeName) {
        ws.send(JSON.stringify({ type: 'error', message: 'not_authenticated' }));
        return;
      }

      if (message.type === 'heartbeat') {
        lastHeartbeatAt = Date.now();
        await fetch(`${API_BASE}/agent/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_name: nodeName,
            node_type: message.nodeType || 'mac-mini',
            meta: message.meta || null,
          }),
        });
        ws.send(JSON.stringify({ type: 'heartbeat_ack', at: new Date().toISOString() }));
        return;
      }

      if (message.type === 'event') {
        await fetch(`${API_BASE}/agent/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_name: nodeName,
            event_type: message.eventType || 'unknown',
            payload: message.payload || {},
            occurred_at: new Date().toISOString(),
          }),
        });
        ws.send(JSON.stringify({ type: 'event_ack' }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'bad_message' }));
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeatWatcher);
    if (nodeName) {
      clients.delete(nodeName);
    }
  });
});

server.listen(PORT, () => {
  console.log(`WS gateway started on port ${PORT}`);
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`WS gateway port ${PORT} is already in use. Stop existing process or change WS_PORT.`);
    process.exit(1);
  }
  console.error('WS gateway server error:', error);
});
