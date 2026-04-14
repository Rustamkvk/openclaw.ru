# OpenClaw Architecture (Variant B)

## Components
- `backend` - Laravel API and authorization core.
- `frontend` - React web cabinet.
- `ws-gateway` - WebSocket bridge for outbound Mac mini integration.
- `openclaw_bd` - MySQL database.

## Main flows
1. Browser authenticates via `POST /api/auth/login`.
2. Laravel issues Sanctum token.
3. React uses bearer token for protected routes.
4. Mac mini connects outbound to `ws-gateway`.
5. Gateway forwards heartbeat/events to Laravel API.

## API surface
- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/profile`
- Admin users: `/api/users`, `/api/users/{id}/role`, `/api/users/{id}/status`
- Monitoring: `/api/system/health`, `/api/system/logs`
- Agent channel: `/api/agent/heartbeat`, `/api/agent/event`, `/api/agent/poll`, `/api/agent/nodes`
