# Migration Plan from control_center

## Stage 1: Parallel launch
- Keep current `control_center` running.
- Start `backend`, `frontend`, `ws-gateway` in parallel.
- Validate auth and admin functions in new stack.

## Stage 2: Data transition
- Create exports from old JSON auth storage if needed.
- Import users into Laravel (`users`, `roles`).
- Verify role mappings (`admin`, `user`).

## Stage 3: Routing switch
- Point main cabinet route to React frontend.
- Proxy `/api/*` to Laravel.
- Proxy `/ws` or dedicated gateway host to `ws-gateway`.

## Stage 4: Stabilization
- Monitor logs and agent heartbeats for 3-7 days.
- Keep old stack read-only fallback.
- Decommission obsolete auth endpoints after acceptance.
