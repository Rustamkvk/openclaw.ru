# Startup Internet Model

## 1. One-command start
Run from project root:

```powershell
.\start-stack.ps1
```

This starts:
- Laravel API on `8000`
- React production preview on `4173`
- WebSocket gateway on `8090`

## 2. Test accounts
- Admin: `admin@openclaw.local` / `Admin123!`
- User: `rus@openclaw.local` / `14725836`

## 3. Internet test prerequisites
Open inbound ports on Windows host:
- `4173` (frontend)
- `8000` (api)
- `8090` (ws)

If host is behind router/NAT:
- forward ports `4173`, `8000`, `8090` to this machine.

## 4. URLs for external testing
- Frontend: `http://<public-ip>:4173`
- API health: `http://<public-ip>:8000/api/system/health` (requires auth)
- WS health: `http://<public-ip>:8090/health`

## 5. Recommended next hardening
- Put nginx reverse proxy in front (`80/443`)
- Enable HTTPS and WSS
- Move secrets from plain `.env` to secure secret storage
