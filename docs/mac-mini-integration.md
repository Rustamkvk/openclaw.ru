# Mac mini Integration Guide

## Goal
Connect Mac mini without static IP using outbound connections only.

## Primary channel (recommended)
- Connect from Mac mini to `ws://<server-ip>:8090`.
- Authenticate using shared token and node name.
- Send heartbeat every 60 seconds.
- Send operational events as needed.

## Fallback channel
- Poll `GET /api/agent/poll?node_name=<name>` every 60 seconds.
- Use fallback when WebSocket is unavailable.

## Required ports on server
- `8000` Laravel API (or proxied port from web server)
- `8090` WebSocket gateway
- `3306` MySQL (internal only, external access not recommended)

## Security baseline
- Change default `WS_SHARED_TOKEN`.
- Restrict allowed source IP ranges when possible.
- Enable HTTPS/WSS on production.
- Rotate tokens periodically.
