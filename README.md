# 言葉の壁 / The Language Wall

Co-op browser game for the "Bridge Kansai / 関西をつなぐ" hackathon: Japanese- and English-speaking
players break a wall by passing everyday words and phrases through a cross-language telephone game,
judged by [TypeSafe Jev](https://typesafe.ai).

Live: https://language-wall.onrender.com/ · Projector view: https://language-wall.onrender.com/?screen ·
Trailer: https://language-wall.onrender.com/?trailer

## Hackathon scope

Some preparation was done **before** the hackathon (2026-10-07 → 2026-10-08, up to and including
commit [`285a7e5`](https://github.com/Dimda/language-wall/commit/285a7e5)): the playable game itself —
realtime server, teams and chains, boss, art, music, spell effects, layout and the answer guard — running
with a placeholder (mock) judge.

**The hackathon starts at commit [`a2f72a4`](https://github.com/Dimda/language-wall/commit/a2f72a4)**
(2026-10-09). Its main goal was the **Jev integration**: replacing the mock judge with
[TypeSafe Jev](https://typesafe.ai), which scores how much meaning survived each translation chain
(exact / same idea / related / lost) and drives the damage. Alongside that, refinements:

- proximity values in the battle log, a host-only END GAME button, a 3-player minimum, removable bots
- a bigger casual vocabulary with short phrases (126 terms)
- furigana (hiragana readings) over kanji, and chains starting in Japanese or English with equal odds

See everything done during the hackathon:
[`285a7e5...main`](https://github.com/Dimda/language-wall/compare/285a7e5...main).

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

Env vars: `TYPESAFE_API_KEY` (enables the Jev judge; without it a mock judge is used — put it in a git-ignored
`.env` locally and in Render's Environment Variables in production), `PORT` (production), `API_PORT` (dev API),
`HOP_SECONDS` (time per hop, default 45), `DEV_BOTS=1` (host can add bots).

## How it plays

- 3–30 players (bots included): the host can't start with fewer than 3; the join screen shows "party full" beyond 30.
- The host can add/remove bots in the lobby (dev mode) and end a running game for everyone (■ END GAME).
- The battle log shows each spell's proximity: how much meaning survived (exact/same/related/lost from the judge).
- When the battle starts, players are split into the fewest teams of at most 5, as evenly as possible
  (21 players → 5·4·4·4·4). Late joiners go to the smallest team.
- Each round every team casts one chain together: every member translates once, alternating JA ⇄ EN.
- Damage scales with chain length: ×(hops / 2), so a 6-hop chain hits three times as hard as a 2-hop one.
