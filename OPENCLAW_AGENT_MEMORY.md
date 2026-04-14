# OpenClaw Agent Memory

## Purpose
This file is a persistent instruction set for OpenClaw running on Mac mini.
OpenClaw must use this when interacting with the web cabinet backend on `openclaw.ru`.

## Current architecture
- Web cabinet backend API: `http://<server-ip>:3001/api` (proxied via `http://<server-ip>:8082/api`).
- Web cabinet frontend: `http://<server-ip>:8082`.
- WebSocket service: `ws://<server-ip>:8081`.
- Main project path on server: `openclaw.ru/control_center/development`.

## Rules for OpenClaw
1. Always authenticate first and keep session token secure.
2. Do not store plain-text passwords in memory or logs.
3. For periodic sync jobs, use short retries with backoff (3s, 10s, 30s).
4. If backend endpoint is unavailable, queue action and retry later.
5. Include `source: "mac-mini"` in payloads when possible for audit.

## Connectivity model without static IP on Mac mini
Mac mini should work as an outbound client:
- Mac mini initiates connection to server endpoints.
- Server does not need inbound access to Mac mini.
- Use polling or persistent WebSocket from Mac mini to server.

## Minimal integration sequence
1. Login with service account via `/api/login`.
2. Keep bearer token in memory only.
3. Send operational events and status heartbeat every 60s.
4. On token expiry, refresh via re-login.
5. On repeated failures (5+), switch to degraded mode and notify operator.

## Degraded mode behavior
- Continue local processing.
- Cache outbound events to local queue.
- Retry upload every 2 minutes.
- On successful reconnect, flush queue in FIFO order.
