# 言葉の壁 / The Language Wall

Co-op browser game for the "Bridge Kansai / 関西をつなぐ" hackathon: Japanese- and English-speaking
developers break a wall by passing dev jargon through a cross-language telephone game.

## Run locally

```bash
pnpm install
pnpm dev            # server on :3210, Vite on :5173
```

- Players: open http://localhost:5173
- Projector view (QR code, no input): http://localhost:5173/?screen

## Production

```bash
pnpm build && pnpm start   # everything on :3210 (or $PORT)
```

Deployed on Render via `render.yaml` (free web service; it sleeps when idle, so open it a few minutes before the demo).

Env vars: `PORT`, `HOP_SECONDS` (time per hop, default 45), `DEV_BOTS=1` (host can add bots).
