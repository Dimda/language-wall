# 言葉の壁 / The Language Wall

**[English](#english) · [日本語](#日本語)**

**▶ Play / プレイ: https://language-wall.onrender.com/** (hosted on Render / Render でホスティング)

| | URL |
| --- | --- |
| Game / ゲーム | https://language-wall.onrender.com/ |
| Projector view (QR to join) / プロジェクター表示（参加用QR） | https://language-wall.onrender.com/?screen |
| Trailer / トレーラー | https://language-wall.onrender.com/?trailer |
| Server status / サーバー状態 | https://language-wall.onrender.com/api/health |

> Render's free tier sleeps after ~15 minutes idle. Open the site a minute before playing so it can wake up.
> Render の無料プランは約15分アクセスがないとスリープします。プレイの1分ほど前にサイトを開いておいてください。

---

## English

Co-op browser game for the "Bridge Kansai / 関西をつなぐ" hackathon: Japanese- and English-speaking
players break a wall by passing everyday words and phrases through a cross-language telephone game,
judged by [TypeSafe Jev](https://typesafe.ai).

### Hackathon scope

Some preparation was done **before** the hackathon (2026-10-07 → 2026-10-08, up to and including
commit [`285a7e5`](https://github.com/Dimda/language-wall/commit/285a7e5)): the playable game itself —
realtime server, teams and chains, boss, art, music, spell effects, layout and the answer guard — running
with a placeholder (mock) judge.

**The hackathon starts at commit [`a2f72a4`](https://github.com/Dimda/language-wall/commit/a2f72a4)**
(2026-10-09). Its main goal was the **Jev integration**: replacing the mock judge with
[TypeSafe Jev](https://typesafe.ai), which scores how much meaning survived each translation chain
(exact / same idea / related / lost) and drives the damage. Alongside that, refinements:

- Jev's verdict and confidence in the battle log, a host-only END GAME button, a 3-player minimum, removable bots
- a bigger casual vocabulary with short phrases (126 terms)
- furigana (hiragana readings) over kanji, and chains starting in Japanese or English with equal odds

See everything done during the hackathon:
[`285a7e5...main`](https://github.com/Dimda/language-wall/compare/285a7e5...main).

### How it plays

1. Everyone opens the game (or scans the QR on the projector), enters a name and picks a Kansai character.
2. The host presses **FIGHT** (3–30 players; bots count). Players are split into the fewest teams of at most 5,
   as evenly as possible (21 players → 5·4·4·4·4). Late joiners go to the smallest team.
3. **Party turn:** each team gets a word or phrase, randomly Japanese or English. It passes through every member,
   and each one translates what they received into the other language (JA ⇄ EN). Answers may not reuse the
   received word and must be written in the target language.
4. **Spells resolve:** the word's journey is revealed, Jev judges how much meaning survived, and the team's spell
   hits the wall. A perfect match is a critical hit; lost meaning fizzles. Damage scales with chain length (×hops/2),
   so bigger teams aren't at a disadvantage. The battle log shows Jev's verdict and confidence.
5. **Enemy turn:** the wall strikes back, harder for every fizzled spell.
6. Break the wall before the party's HP runs out and a bridge forms across Kansai.

The host can add/remove bots in the lobby (dev mode) and end a running game for everyone (■ END GAME).

### Judge

Each finished chain asks Jev one Choice question — does the final text keep the meaning of the original
(exact / same idea / related / lost)? The probabilities feed the damage formula. An exact (normalized) match
skips the API and counts as a full hit. Idioms are judged by meaning, so a literal word-for-word translation
doesn't count. If Jev is unavailable the game falls back to a mock judge so a spell never hangs.

### Run locally

```bash
pnpm install
pnpm dev            # API on :3210 (or $API_PORT), Vite on :5173
```

- Players: http://localhost:5173 · Projector view: http://localhost:5173/?screen · Trailer: http://localhost:5173/?trailer
- Tests: `pnpm test` · Type check: `pnpm typecheck`

### Production

```bash
pnpm build && pnpm start   # everything on :3210 (or $PORT)
```

Deployed on [Render](https://render.com) via `render.yaml` at https://language-wall.onrender.com/ (free web service).

Env vars:

- `TYPESAFE_API_KEY` — enables the Jev judge; without it a mock judge is used. Put it in a git-ignored `.env`
  locally and in Render's **Environment Variables** in production (never in the code).
- `PORT` (production), `API_PORT` (dev API), `HOP_SECONDS` (time per hop, default 45), `DEV_BOTS=1` (host can add bots).

### Tech

React 19 + TypeScript + Vite · Node 24 + Express + Socket.IO (server-authoritative game state) ·
TypeSafe Jev (judge) · kuromoji (furigana) · procedural SVG/canvas pixel art and Web Audio chiptune music.

---

## 日本語

「関西をつなぐ / Bridge Kansai」ハッカソンのための協力型ブラウザゲームです。日本語話者と英語話者が、
日常の言葉やフレーズを言語をまたいだ伝言ゲームでつなぎ、[TypeSafe Jev](https://typesafe.ai) の判定で
「言葉の壁」を壊します。

**▶ プレイはこちら（Render で公開中）: https://language-wall.onrender.com/**

### ハッカソンの範囲

ハッカソン**前**に一部の準備を行いました（2026-10-07 〜 2026-10-08、コミット
[`285a7e5`](https://github.com/Dimda/language-wall/commit/285a7e5) まで）。ゲーム本体 —
リアルタイムサーバー、チームと伝言チェーン、ボス、アート、音楽、魔法エフェクト、レイアウト、回答チェック —
を、仮の判定（モック）で動く状態まで作っています。

**ハッカソンはコミット [`a2f72a4`](https://github.com/Dimda/language-wall/commit/a2f72a4) から始まります**
（2026-10-09）。主な目標は **Jev の統合** です。モック判定を [TypeSafe Jev](https://typesafe.ai) に置き換え、
伝言チェーンでどれだけ意味が残ったか（完全一致 / 同じ意味 / 関連 / 失われた）を判定し、そのままダメージに
反映します。あわせて以下の改善も行いました:

- バトルログに Jev の判定と確信度を表示、ホスト専用の終了ボタン、3人以上で開始、ボットの削除
- 語彙を拡大し、短いフレーズも追加（126語）
- 漢字にふりがな（ひらがな）を表示、最初の言葉は日本語・英語をランダムに出題

ハッカソン中に行った変更の一覧:
[`285a7e5...main`](https://github.com/Dimda/language-wall/compare/285a7e5...main)

### 遊び方

1. 各自ゲームを開く（またはプロジェクターの QR コードを読み取る）、名前を入力して関西のキャラクターを選びます。
2. ホストが **FIGHT** を押します（3〜30人、ボットも人数に含みます）。参加者は最大5人のチームに、
   できるだけ均等に自動で分かれます（21人なら 5・4・4・4・4）。途中参加の人は一番人数の少ないチームに入ります。
3. **味方のターン:** 各チームに日本語または英語（ランダム）の言葉・フレーズが出題されます。言葉はチーム全員を
   順番に回り、各自が受け取った言葉をもう一方の言語に翻訳します（日本語 ⇄ 英語）。受け取った言葉をそのまま
   使うことはできず、指定された言語で書く必要があります。
4. **魔法の発動:** 言葉がどう変わっていったかが表示され、Jev がどれだけ意味が残ったかを判定し、チームの魔法が
   壁に命中します。完全一致はクリティカルヒット、意味が失われると魔法は不発（ぷすん…）。チェーンが長いほど
   ダメージが大きくなるので（×人数/2）、大きなチームも不利になりません。バトルログには Jev の判定と確信度が
   表示されます。
5. **敵のターン:** 壁が反撃します。不発の魔法が多いほど強い攻撃になります。
6. パーティーの HP がなくなる前に壁を壊せば、関西に橋がかかります。

ホストはロビーでボットの追加・削除（開発モード）や、進行中のゲームを全員分終了（■ 終了）できます。

### 判定について

チェーンが完成するたびに、Jev に1つの選択式の質問をします — 最後の文は元の言葉の意味を保っているか
（完全一致 / 同じ意味 / 関連 / 失われた）。その確率がそのままダメージ計算に使われます。元の言葉と完全に
一致した場合は API を使わず、そのまま完全ヒットになります。慣用句は意味で判定するため、直訳で意味が
変わってしまった場合は正解になりません。Jev に接続できない場合は、魔法が止まらないようモック判定に切り替わります。

### ローカルで動かす

```bash
pnpm install
pnpm dev            # API は :3210（または $API_PORT）、Vite は :5173
```

- プレイヤー: http://localhost:5173 ・ プロジェクター表示: http://localhost:5173/?screen ・ トレーラー: http://localhost:5173/?trailer
- テスト: `pnpm test` ・ 型チェック: `pnpm typecheck`

### 本番環境

```bash
pnpm build && pnpm start   # すべて :3210（または $PORT）で動作
```

`render.yaml` で [Render](https://render.com) にデプロイしています: https://language-wall.onrender.com/ （無料プラン）

環境変数:

- `TYPESAFE_API_KEY` — Jev の判定を有効にします。未設定の場合はモック判定になります。ローカルでは git に
  含まれない `.env` に、本番では Render の **Environment Variables** に設定してください（コードには書きません）。
- `PORT`（本番）、`API_PORT`（開発用 API）、`HOP_SECONDS`（1人あたりの制限時間、初期値45秒）、
  `DEV_BOTS=1`（ホストがボットを追加可能）

### 技術

React 19 + TypeScript + Vite ・ Node 24 + Express + Socket.IO（ゲーム状態はサーバーで管理） ・
TypeSafe Jev（判定） ・ kuromoji（ふりがな） ・ SVG / canvas で描くピクセルアートと Web Audio のチップチューン音楽
