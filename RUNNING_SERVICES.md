# Running Services

This guide is the local development runbook for Site Fitness.

## Services

| Service | URL | Notes |
| --- | --- | --- |
| Frontend | http://localhost:3000 | Next.js admin/member UI |
| Backend API | http://localhost:5001/api | Flask API |
| Backend Swagger | http://localhost:5001/api/docs/ | API documentation |
| PostgreSQL | localhost:5432 | Docker database |
| OpenWA API | http://localhost:2785/api | WhatsApp service |
| OpenWA Dashboard | http://localhost:2886 | OpenWA admin UI |
| MinIO API | http://localhost:9000 | Exercise media object storage |
| MinIO Console | http://localhost:9001 | MinIO admin UI |

## 1. Start OpenWA

From the cloned OpenWA folder:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

OpenWA local development uses:

```txt
API key: dev-admin-key
```

Check the running OpenWA API key if needed:

```bash
docker logs openwa-api | grep -A1 "API Key"
```

## 2. Start Backend

From this project root:

```bash
cp backend/.env.example backend/.env
```

Only run this once, or whenever `backend/.env` is missing.

Then start the backend:

```bash
docker-compose up -d --build backend
```

The backend service also starts PostgreSQL.

To start only PostgreSQL:

```bash
docker-compose up -d postgres
```

Check that PostgreSQL is healthy:

```bash
docker-compose ps postgres
docker-compose exec postgres pg_isready -U sitefitness -d sitefitness
```

Connect to the database from inside the container:

```bash
docker-compose exec postgres psql -U sitefitness -d sitefitness
```

Local database settings:

```txt
Host: localhost
Port: 5432
Database: sitefitness
Username: sitefitness
Password: sitefitness
```

Stop PostgreSQL without deleting the database volume:

```bash
docker-compose stop postgres
```

Apply migrations:

```bash
docker-compose exec backend flask --app run db upgrade
```

Run this again after backend model changes, such as membership plans or
subscriptions.

Create the first owner account if needed:

```bash
docker-compose exec backend flask --app run seed-owner --email owner@example.com
```

Useful backend checks:

```bash
docker-compose logs -f backend
curl http://localhost:5001/api/health
```

## 3. Start Frontend

From this project root:

```bash
docker-compose up -d --build frontend
```

Open:

```txt
http://localhost:3000
```

The frontend code is bind-mounted into the container, so normal source edits
reload through the Next.js dev server.

If you add a brand-new route folder under `frontend/src/app` and it returns a
404, restart the frontend container so Next.js rebuilds its route tree:

```bash
docker-compose restart frontend
```

## 4. WhatsApp Test

Log in to the frontend as an owner, staff member, or trainer. Then open:

```txt
http://localhost:3000/admin/notifications
```

Send a test message using a Peru phone number such as:

```txt
948327856
```

The backend converts that to:

```txt
51948327856@c.us
```

You can also test with curl after logging in and saving cookies:

```bash
curl -X POST http://localhost:5001/api/notifications/whatsapp/test \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"phone": "948327856", "text": "Hello from Site Fitness"}'
```

## 5. Membership Workflow

Log in as an owner, staff member, or trainer. Then open:

```txt
http://localhost:3000/admin/plans
```

Use this page to:

- Create membership plans such as Monthly, Quarterly, or Annual
- Assign a plan to a member
- Preview members whose memberships are expired or expiring within 7 days
- Send WhatsApp reminder messages for those members

The member list at:

```txt
http://localhost:3000/admin/members
```

shows each member's current plan, end date, days remaining, and membership
status.

Members can view their own membership status at:

```txt
http://localhost:3000/member
```

## 6. Start MinIO

MinIO is optional local object storage for processed exercise videos and
thumbnails.

From the project root:

```bash
cd minio
docker-compose up -d
```

Open:

```txt
http://localhost:9001
```

Default local credentials:

```txt
Username: sitefitness
Password: sitefitness-minio-password
Bucket: exercise-media
```

For exercise demos, prefer short muted MP4/WebM files over GIF. They are usually
smaller, can be paused, and work better in the browser.

Process imported YouTube exercise videos into MinIO:

```bash
cd ../etl
docker-compose build
docker-compose run --rm exercise-video-etl
```

## 7. Stop Services

Stop the app containers:

```bash
docker-compose stop frontend backend
```

Stop everything in this compose project, including PostgreSQL:

```bash
docker-compose down
```

Stop OpenWA from the OpenWA folder:

```bash
docker-compose -f docker-compose.dev.yml down
```

## Local Config Notes

Backend Docker overrides:

```txt
DATABASE_URL=postgresql://sitefitness:sitefitness@postgres:5432/sitefitness
OPENWA_API_URL=http://host.docker.internal:2785/api
```

Local invite links use:

```txt
PUBLIC_FRONTEND_ORIGIN=http://127.0.0.1:3000
```

Keep `FRONTEND_ORIGIN=http://localhost:3000` for browser CORS, and use
`PUBLIC_FRONTEND_ORIGIN` for links sent to members. In production, set
`PUBLIC_FRONTEND_ORIGIN` to the real public HTTPS domain.

Frontend Docker uses:

```txt
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api
```

Important backend environment values live in:

```txt
backend/.env
```
