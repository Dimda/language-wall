# 言葉の壁 / The Language Wall

Co-op browser game for the "Bridge Kansai / 関西をつなぐ" hackathon: Japanese- and English-speaking
developers break a wall by passing dev jargon through a cross-language telephone game.

## Run locally

```bash
pnpm install
pnpm dev            # API on :3210 (or $API_PORT), Vite on :5173
```

- Players: open http://localhost:5173
- Projector view (QR code, no input): http://localhost:5173/?screen

## Production

```bash
pnpm build && pnpm start   # everything on :3210 (or $PORT)
```

Deployed on Render via `render.yaml` (free web service; it sleeps when idle, so open it a few minutes before the demo).

Env vars: `PORT` (production), `API_PORT` (dev API), `HOP_SECONDS` (time per hop, default 45), `DEV_BOTS=1` (host can add bots).

## How it plays

- Up to 30 players (bots included); the join screen shows "party full" beyond that.
- When the battle starts, players are split into the fewest teams of at most 5, as evenly as possible
  (21 players → 5·4·4·4·4). Late joiners go to the smallest team.
- Each round every team casts one chain together: every member translates once, alternating JA ⇄ EN.
- Damage scales with chain length: ×(hops / 2), so a 6-hop chain hits three times as hard as a 2-hop one.
