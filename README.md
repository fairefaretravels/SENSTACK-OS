# Showdown Live

An AI game show host (Jeopardy-style and Family Feud-style rounds), running as a
standalone local web app. The browser never sees your API key — it talks to a
small local server, which talks to Anthropic.

## Setup

1. **Install Node.js 18+** if you don't already have it (https://nodejs.org).

2. **Install dependencies** — from this folder, run:
   ```
   npm install
   ```

3. **Add your API key** — copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
   Then open `.env` and paste in your real Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   Get a key from https://console.anthropic.com if you don't have one.

4. **Start the server**:
   ```
   npm start
   ```

5. **Open the game** — go to `http://localhost:3000` in your browser.

## How it works

- `public/index.html` is the whole game (UI + game logic). Its `fetch` calls go
  to `/api/messages` on your own server, not directly to Anthropic.
- `server.js` is a tiny Express server that receives those calls, attaches your
  real API key server-side, forwards the request to Anthropic, and returns the
  response. This is what keeps the key out of the browser (and out of anything
  a user could view via "inspect element").

## Deploying it somewhere real

If you want this reachable outside your own machine (a small VPS, Render,
Railway, Fly.io, etc.), the same `server.js` works as-is — just set the
`ANTHROPIC_API_KEY` environment variable in that host's dashboard instead of a
local `.env` file, and make sure the platform runs `npm install && npm start`.

## Notes

- Each clue/guess makes a live API call, so there's a short "judging..." delay
  by design — that's the model actually generating and scoring, not a bug.
- Costs: every round played uses your Anthropic API credits (board/round
  generation + one judging call per clue or guess). Keep an eye on usage in
  the Anthropic console if you're sharing this with others.
