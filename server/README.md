# Reflo server (Express + PostgreSQL)

Firebase Auth remains the **source of truth for identity**.  
Postgres `users` is a **synced mirror** keyed by Firebase UID (for foreign keys only).

## Setup

1. Create a Postgres database named `reflo`.
2. Copy `.env.example` → `.env` and set `DATABASE_URL` + Firebase Admin credentials.
3. Install + migrate + run:

```bash
cd server
npm install
npm run migrate
npm run dev
```

Health: `GET http://localhost:8787/health`

## Auth

Send `Authorization: Bearer <Firebase ID token>` on `/api/v1/*` (except health).  
On every authenticated request, middleware verifies the token with Firebase Admin, then upserts `users(firebase_uid, email)`.

## Routes

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | No auth |
| GET/POST | `/api/v1/users/me` | Mirror row |
| GET/POST | `/api/v1/sessions` | List / upsert |
| GET/DELETE | `/api/v1/sessions/:dateKey` | By day |
| GET | `/api/v1/progress/summary?period=week\|month\|all` | Aggregates |

Profile, weekly plans, generated workouts, and voice quota stay on Firestore.
