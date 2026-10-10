# client-web-app

Next.js starter for the KnightHacks phone client: talk to a vision AI that sees through the ESP32 camera necklace.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- React 19

## Run locally

```bash
cd client-web-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On a phone on the same Wi‑Fi as the camera (or the ELEGOO softAP), use your laptop’s LAN IP, e.g. `http://192.168.x.x:3000`.

## Related

| Path | Role |
|------|------|
| `../esp32-cam/` | PlatformIO STA streaming firmware |
| `../vendor/` | ELEGOO stock softAP firmware |

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
