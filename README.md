# ID Systems — Life Operating System

A goal-setting / "Life OS" app: an AI Identity Architect helps you define
systems and microtasks, run weekly reflections, and visualize your future with
generated images and video.

## AI providers (BYOK — Bring Your Own Key)

This app uses **your own API key**. Nothing is stored on the server:

- Pick a provider (**OpenAI**, **Anthropic**, or **Google Gemini**) and a model in
  **AI Settings** (gear, top-right).
- Paste your API key. It is kept **only in your browser tab** (`sessionStorage`,
  cleared when you close the tab) and sent per-request to the app's own server,
  which proxies it to the chosen provider. The key is **never persisted or logged
  server-side**, and **never baked into the front-end bundle**.

### Capabilities by provider

| Capability | OpenAI | Anthropic | Gemini |
|------------|:------:|:---------:|:------:|
| Text / chat / reflections | ✅ | ✅ | ✅ |
| Image generation | ✅ | — | ✅ |
| Video generation | — | — | ✅ |

If you select a provider that doesn't support a feature (e.g. video on OpenAI),
the UI shows a notice and prompts you to switch providers.

Add or change models in `src/server/providers.ts` (the `PROVIDERS` catalog) —
the Settings UI is data-driven via `GET /api/providers`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000 (Vite middleware + Express API)
```

Open the app, click **AI Settings**, choose a provider/model, paste a key, hit
**Test key**, Save. No `.env` is required for AI anymore (it's BYOK).

## Build & deploy (production)

```bash
npm run build      # vite build -> dist/ + esbuild server.ts -> dist/server.cjs
npm start          # NODE_ENV=production node dist/server.cjs   (serves dist/ + API)
```

The production server (`server.ts` → `dist/server.cjs`) serves the static
front-end **and** acts as the BYOK proxy. Deploy it anywhere that runs Node
(Render, Fly.io, Railway, a container, etc.). Port comes from `PORT` (default
3000).

### Environment variables

| Var | Required | Purpose |
|-----|----------|---------|
| `PORT` | no (default 3000) | Server port |
| `NODE_ENV` | for prod | Set to `production` to serve `dist/` instead of Vite |
| `ALLOWED_HOSTS` | no | Comma-separated dev host allowlist (Vite dev only) |

> There is intentionally **no** server-side AI key env var — the app is BYOK.

### Firebase (optional)

Google sign-in / Calendar / Tasks integration uses Firebase. Provide a real
`firebase-applet-config.json` (the committed one is a mock) via your deploy's
config mechanism. Firebase web config keys are non-secret by design.

## Security notes

- API keys travel **per-request over HTTPS**; serve this app over TLS in prod.
- The server scrubs key-like strings (`sk-…`, `AIza…`) from error logs.
- No key is ever written to the client bundle, `localStorage`, or the server
  filesystem.
