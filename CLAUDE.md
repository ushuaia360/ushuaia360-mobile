# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Ushuaia 360** is a mobile app (iOS + Android) for tourists and trekkers in Ushuaia, Argentina. Core features:

- **Trails**: detailed info (distance, difficulty, estimated time), exact GPS traces, key waypoints along the route.
- **360 photos**: immersive photography at strategic points on trails and tourist places — viewable before or during the hike.
- **Tourist places**: points of interest (viewpoints, natural sites, attractions) browseable via map or list, also with 360 content.
- **Offline mode**: full trail downloads (map, GPS trace, info, 360 photos) for use without internet. This is the core freemium mechanic — one free trail download, the rest require premium.
- **User accounts**: favorites, trail history, personal stats, ratings and comments.
- **Future scope**: emergency/mountain rescue services leveraging geolocation and trail data.

The companion **web admin panel** (separate repo) manages trails, GPS traces, 360 photos, waypoints, tourist places, comment moderation and usage reports.

## Commands

```bash
npm start          # Start Expo dev server (scan QR with Expo Go or dev build)
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in browser
npm run lint       # Run ESLint
```

There are no automated tests currently.

## Architecture

React Native + Expo (SDK 54), **expo-router** for file-based routing, TypeScript strict mode. New Architecture and React Compiler are both enabled (`newArchEnabled: true`, `reactCompiler: true`).

### Routing structure

- `app/_layout.tsx` — Root layout with `ThemeProvider`. Stack navigator anchored at `(tabs)`, plus `login` and `register` as card screens.
- `app/(tabs)/` — Tab navigator with a `CustomTabBar`. Visible tabs: `index`, `search`, `map`, `favorites`, `profile`. Hidden tabs (accessible via `Link`/`router` but not shown in the tab bar): `places`, `trails`.
- `app/login.tsx`, `app/register.tsx` — Auth screens supporting email/password, Google OAuth and Apple Sign In. Auth logic is mostly stubbed with TODOs.

### Path alias

`@/` maps to the repository root (e.g., `@/components/themed-text`, `@/constants/theme`).

### Theming

- `constants/theme.ts` exports `Colors` (light/dark palettes) and `Fonts` (platform-specific font stacks).
- `hooks/use-color-scheme.ts` re-exports `useColorScheme` from `react-native`. A `.web.ts` variant exists for web.
- Screens resolve colors with `const colors = Colors[colorScheme ?? 'light']` — no styled-components or Nativewind.
- `ThemedText` and `ThemedView` in `components/` auto-apply theme colors.

### Component & file conventions

- File names use **kebab-case** (e.g., `custom-tab-bar.tsx`, `themed-text.tsx`).
- `components/ui/icon-symbol.tsx` wraps `@expo/vector-icons`. An `.ios.tsx` platform-specific variant renders native SF Symbols on iOS.
- `IconSymbol` uses SF Symbol names (e.g., `"house.fill"`, `"magnifyingglass"`).
- All UI uses `StyleSheet.create` — no utility-class libraries.

### State management

**Zustand** stores in `store/`:
- `home-store.ts` — `mode: 'map' | 'list'` controlling the two Home views.
- `trails-store.ts` — trail data + `searchQuery` + `filteredTrails()` selector. Mock data sourced from `constants/mock-trails.ts`.

### Home screen — two modes

`app/(tabs)/index.tsx` renders either `MapHome` or `ListHome` based on `useHomeStore().mode`.

- **MapHome** (`components/home/map-home.tsx`): full-screen `react-native-maps` MapView centered on Ushuaia with trail markers, floating `SearchBar` at top, `TrailsBottomSheet` at bottom. Bottom sheet has two snap points (collapsed ~220px / 70% height); "Ver todos" switches to list mode.
- **ListHome** (`components/home/list-home.tsx`): header with `SearchBar` + count, `FlatList` of `TrailListCard`s, floating "Ver Mapa" FAB that switches back to map mode.

Key components in `components/home/`:
- `search-bar.tsx` — connected to `trailsStore.searchQuery`, shared between both modes
- `trails-bottom-sheet.tsx` — `@gorhom/bottom-sheet` with featured trail cards
- `trail-featured-card.tsx` — compact card for the bottom sheet
- `trail-list-card.tsx` — detailed Wikiloc-style card for the list view

`constants/mock-trails.ts` defines the `Trail` type, `MOCK_TRAILS` (6 Ushuaia trails), and `USHUAIA_REGION` (MapView initial region).

## Key technical areas still to build

- **360 viewer**: panoramic photo viewer component (library TBD).
- **Offline download manager**: `expo-file-system` + `@react-native-async-storage/async-storage` (already installed).
- **Auth**: wire up the stubbed login/register flows to a backend.
- **Trail detail screen**: new route `app/trail/[id].tsx`.

---

## Backend (`/Users/facu/work/ushuaia360-backend`)

Python async API built with **Quart** (async Flask), running on port **5050**.

### Stack
- **Quart 0.19** + **quart-cors** — async ASGI web framework
- **asyncpg** — async PostgreSQL driver (Supabase)
- **PyJWT** + **bcrypt/passlib** — authentication
- **Resend** — transactional email (verification, password reset)
- **python-dotenv** — `.env` config

### Commands
```bash
cd /Users/facu/work/ushuaia360-backend
python app.py          # Start dev server (port 5050)
```

### API base URL
All endpoints are prefixed with `/api/v1`.

### Auth flows
- **Web admin**: `POST /api/v1/auth/login` → sets `HttpOnly` cookie `token` (JWT). Only `is_admin` users can log in here.
- **Mobile app**: `POST /api/v1/auth/login-app` → returns `{ token }` in JSON body. JWT stored client-side and sent as `Authorization: Bearer <token>`.
- **Registration**: `POST /api/v1/auth/register` → sends email verification link via Resend. User must verify email before logging in.
- JWT expiry: 14 days (`JWT_EXPIRATION_SECONDS`). Tokens are HS256, payload contains `user_id` (UUID string).

### Auth decorators (in `routes/trails.py`, reused across routes)
- `@require_auth` — injects `user_id` kwarg from JWT (cookie or `Authorization` header)
- `@require_admin` — same, but additionally checks `users.is_admin = true` in DB

### Route map

| Blueprint | Prefix | Key endpoints |
|-----------|--------|---------------|
| `auth_bp` | `/api/v1/auth` | `POST /register`, `POST /login`, `POST /login-app`, `GET /me`, `GET /me-app`, `POST /verify-email`, `POST /forgot-password`, `POST /change-password`, `POST /logout` |
| `trails_bp` | `/api/v1` | CRUD `/trails`, `/trails/<id>/routes`, `/trails/<id>/routes/<id>/segments`, `/trails/<id>/points`, `/trails/<id>/media`, `/trails/<id>/reviews` |
| `places_bp` | `/api/v1` | Tourist places |
| `favorites_bp` | `/api/v1` | User favorites |
| `map_bp` | `/api/v1` | Map markers |
| `trail_history_bp` | `/api/v1` | `/me/trail-history/*` |
| `search_bp` | `/api/v1` | Autocomplete search |
| `uploads_bp` | `/api/v1` | Review photo uploads → Supabase `reviews` bucket |
| `dashboard_bp` | `/api/v1` | Admin stats |
| `users_bp` | `/api/v1` | User management |

### Data model (key tables)
- **`users`**: `id` (UUID), `email`, `password_hash`, `full_name`, `avatar_url`, `language`, `is_admin`, `is_premium`, `premium_until`, `email_verified`
- **`trails`**: `id`, `slug`, `name`, `description`, `difficulty` (`easy/medium/hard`), `route_type` (`circular/lineal/ida_vuelta`), `region`, `distance_km`, `elevation_gain/loss`, `max/min_altitude`, `duration_minutes`, `map_point` (JSONB `{latitude, longitude}`), `is_featured`, `is_premium`, `status_id`
- **`trail_routes`**: versioned GPS traces for a trail (`is_active` = current version)
- **`route_segments`**: `path` stored as JSONB `[[lat, lon], ...]` (Leaflet order)
- **`trail_points`**: waypoints — types: `inicio/fin/mirador/peligro/agua/descanso/refugio/cruce/campamento/cascada/vista/informacion`. `location` stored as JSONB `{latitude, longitude, elevation}`
- **`trail_media`**: `media_type` = `image | photo_360 | photo_180 | video`. Linked to trail or trail_point
- **`trail_reviews`**: `rating` (1–5), `comment`, `image_urls` (text[])
- **`favorites`**, **`trail_history`**, **`places`**

### Important implementation notes
- `map_point`, `location`, and `path` are stored as **JSONB** (not PostGIS geography), serialized manually on insert/update.
- Route segment `path` is saved as `[lat, lon]` pairs (Leaflet convention), but GeoJSON input (`LineString`) is normalized from `[lng, lat]` on the way in.
- Mobile app endpoints (`/login-app`, `/me-app`) accept `Authorization: Bearer <token>` header; web endpoints use cookies.
- Migrations are in `db/migrations/`.
