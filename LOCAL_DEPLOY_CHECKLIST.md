# Local Deploy Checklist (Open Server Panel)

## 1) OSP project alignment
- Project root: `openclaw.ru`
- Frontend/API runtime folder: `control_center/development`
- MySQL DB: `openclaw_bd`
- PHP runtime in `.osp/config.json` is not used by Node services, but can stay enabled.

## 2) Start services
From `control_center/development`:

```powershell
node simple-auth-server.js
node simple-http-server.js
node websocket-server.js
```

or:

```powershell
node start-all.js
```

## 3) Smoke tests
- `http://localhost:8082`
- `http://localhost:8082/api/health`
- Login default account: `admin / Admin123!`

## 4) Firewall (Windows Server)
Required inbound TCP ports:
- `8082` frontend and API proxy
- `3001` direct API (optional externally, required internally)
- `8081` websocket

Commands (PowerShell as Administrator):

```powershell
New-NetFirewallRule -DisplayName "OpenClaw-Frontend-8082" -Direction Inbound -Protocol TCP -LocalPort 8082 -Action Allow
New-NetFirewallRule -DisplayName "OpenClaw-API-3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "OpenClaw-WS-8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
```

## 5) Mac mini integration without static IP
- Do not open inbound ports on Mac mini.
- Mac mini should connect out to server IP over HTTPS/HTTP/WebSocket.
- If external access is needed and server is behind NAT, configure router port-forwarding to this Windows host.
