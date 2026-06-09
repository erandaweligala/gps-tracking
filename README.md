# GPS Tracking

A cross-platform system to **track a device's location in the background** and
**monitor it remotely** in real time on a web map.

```
┌─────────────────────┐         ┌──────────────────────────┐         ┌────────────────────┐
│  Flutter app        │  HTTPS  │  Node + TS backend       │   WS    │  React dashboard   │
│  (Android + iOS)    │ ──────► │  Fastify REST + Socket.IO│ ──────► │  Leaflet live map  │
│  background_locator │   WS    │                          │         │  + history trail   │
│  + offline buffer   │ ──────► │            │             │         └────────────────────┘
└─────────────────────┘         │            ▼             │
                                │   PostgreSQL + PostGIS   │
                                └──────────────────────────┘
```

## Components

| Folder       | Stack                                   | Purpose                                            |
|--------------|-----------------------------------------|----------------------------------------------------|
| `tracker/`   | Flutter (Dart) + `background_locator_2` | Runs on the tracked phone, reports GPS in the bg.  |
| `backend/`   | Node + TypeScript + Fastify + Socket.IO | Ingests locations, stores history, relays live.    |
| `dashboard/` | React + Vite + Leaflet                  | Remote viewer with a live map + history trail.     |

The tracker uses the **free, open-source** [`background_locator_2`](https://pub.dev/packages/background_locator_2)
plugin. It works on Android & iOS; see `tracker/README.md` for the required
native permission setup.

## Quick start (local dev)

### 1. Backend + database

```bash
docker compose up -d            # starts Postgres+PostGIS and the backend
# OR run the backend directly:
cd backend
cp .env.example .env
npm install
npm run dev                     # http://localhost:4000
```

The schema in `backend/src/schema.sql` is applied automatically on first boot.

### 2. Dashboard

```bash
cd dashboard
npm install
npm run dev                     # http://localhost:5173
```

Log in with the demo device token printed by the backend on startup, or set
your own in `.env`.

### 3. Tracker (Flutter app)

```bash
cd tracker
flutter pub get
# Point the app at your backend in lib/config.dart, then:
flutter run
```

## Auth model

- **Devices** authenticate with a long-lived JWT (`DEVICE_TOKEN`) and may only
  POST their own locations.
- **Dashboard users** authenticate with a separate JWT and may read any device.

Both are signed with `JWT_SECRET`. See `backend/src/auth.ts`.

## Production notes

- Always serve over **HTTPS / WSS** — you are transmitting real-time location.
- Tune the tracker's distance filter (default 25 m) to balance accuracy vs.
  battery.
- **Consent & privacy:** background location requires a clear in-app disclosure
  and a privacy policy to pass App Store / Play review. Design this in early.

## Deploy (managed cloud)

- Backend + dashboard → Render / Railway / Fly.io (auto HTTPS, WebSocket support).
- Database → Neon / Supabase (managed Postgres + PostGIS).
- Set `JWT_SECRET`, `DATABASE_URL`, and `CORS_ORIGIN` as environment variables.
