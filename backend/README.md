# Backend

Flask API for the Site Fitness gym management system.

## Database Migrations

This backend uses Flask-Migrate, which is a Flask wrapper around Alembic. SQLAlchemy models define the database shape, and migrations convert those model changes into PostgreSQL schema changes.

## Migration Philosophy

Use migrations for every database schema change after the initial setup.

Examples of changes that need migrations:

- Creating a new table
- Adding a column
- Removing a column
- Renaming a column
- Adding an index
- Adding a foreign key
- Changing a nullable field
- Changing an enum/status constraint

Do not manually edit the production database schema through a database GUI unless it is an emergency and the change is later captured in a migration.

## Initial Setup

From the `backend/` folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Make sure PostgreSQL is running from the project root:

```bash
docker-compose up -d postgres
```

## Docker Development Backend

From the project root, build and start the backend plus PostgreSQL:

```bash
docker-compose up -d --build backend
```

The backend runs on:

```txt
http://localhost:5001
```

API documentation is available at:

```txt
Swagger UI: http://localhost:5001/api/docs/
OpenAPI JSON: http://localhost:5001/api/openapi.json
```

Send a WhatsApp test message after logging in as staff/owner:

```bash
curl -X POST http://localhost:5001/api/notifications/whatsapp/test \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"phone": "948327856", "text": "Hello from Site Fitness"}'
```

The compose setup bind-mounts `./backend` into the container at `/app`, so edits
to backend code are visible inside the running container. Flask debug mode in
`run.py` will reload the app for normal Python file changes.

Useful commands:

```bash
docker-compose logs -f backend
docker-compose restart backend
docker-compose down
```

Run migrations inside the backend container:

```bash
docker-compose exec backend flask --app run db upgrade
```

Create the first owner account inside the backend container:

```bash
docker-compose exec backend flask --app run seed-owner --email owner@example.com
```

Important container URLs:

```txt
DATABASE_URL=postgresql://sitefitness:sitefitness@postgres:5432/sitefitness
OPENWA_API_URL=http://host.docker.internal:2785/api
```

`postgres` is the Docker Compose service name for the database. On macOS,
`host.docker.internal` lets the backend container call OpenWA if OpenWA is
running on your Mac at `localhost:2785`.

The migration folder has already been initialized for this project. If you ever start a brand new backend from scratch, the command would be:

```bash
flask --app run db init
```

That creates the Alembic migration structure inside `backend/migrations/`.

Important: run `db init` only once for a project. For this project, do not run it again. Use `db migrate` and `db upgrade` instead.

## Creating A Migration

After changing SQLAlchemy models, generate a migration:

```bash
flask --app run db migrate -m "create users table"
```

Always open and review the generated migration file before applying it.

Check that the migration correctly includes:

- New tables
- New columns
- Indexes
- Foreign keys
- Nullable changes
- Default values
- Downgrade steps

Alembic autogeneration is helpful, but it is not perfect. Rename operations and complex constraint changes often need manual edits.

## Applying Migrations

Apply all pending migrations:

```bash
flask --app run db upgrade
```

Check current migration version:

```bash
flask --app run db current
```

View migration history:

```bash
flask --app run db history
```

## Rolling Back

Rollback one migration:

```bash
flask --app run db downgrade -1
```

Rollback to a specific revision:

```bash
flask --app run db downgrade <revision_id>
```

Use rollback carefully, especially if the migration deletes data or changes column types.

## Recommended Workflow

For each backend feature:

1. Update or create SQLAlchemy models.
2. Generate a migration with `flask --app run db migrate -m "..."`
3. Review the generated migration file.
4. Apply it locally with `flask --app run db upgrade`.
5. Test the API against the migrated database.
6. Commit the model changes and migration file together.

## Example: Adding Authentication Tables

Authentication tables have already been added in this project in:

```txt
migrations/versions/20260531_0001_create_auth_tables.py
```

That migration creates:

```txt
users
- id
- email
- password_hash
- role
- status
- email_verified_at
- last_login_at
- created_at
- updated_at

member_invites
- id
- member_id
- email
- token_hash
- expires_at
- accepted_at
- created_at
```

Apply it with:

```bash
flask --app run db upgrade
```

For future auth-related schema changes, create a new migration instead of editing this existing migration.

## Auth Commands

Create the first owner account:

```bash
flask --app run seed-owner --email owner@example.com
```

The command prompts for a password and stores a password hash, not the raw password.

Show the current backend database URL:

```bash
flask --app run show-config
```

## Workout Library Import

The backend has a workout import command for JSON files shaped like
`week-1-workouts.json`.

Before importing, apply the migrations:

```bash
flask --app run db upgrade
```

Before importing a new week, sanity-check that exercise and substitution names
match their YouTube video titles:

```bash
cd ..
python3 tools/check_workout_youtube_matches.py week-4-workouts.json --insecure --threshold 0.55
cd backend
```

If the checker reports substitution URL swaps, review the output. To apply the
strong swap candidates automatically:

```bash
cd ..
python3 tools/check_workout_youtube_matches.py week-4-workouts.json --insecure --threshold 0.55 --apply-swaps
cd backend
```

`--insecure` is only for local machines where Python cannot verify YouTube's
TLS certificate chain.

From the `backend/` folder, import the current Week 1 file from the project
root:

```bash
flask --app run import-workouts ../week-1-workouts.json \
  --program-name "The Bodybuilding Transformation System (Beginner)" \
  --source-name "Jeff Nippard 2025" \
  --level beginner
```

The command is safe to run again. It updates the same program, week, day, and
exercise slots instead of creating duplicate workout prescriptions.

The importer creates or updates:

```txt
exercises
exercise_media
training_programs
training_weeks
training_days
training_day_exercises
training_day_exercise_substitutions
```

## Production Deployment

In production, migrations should run before the new backend version starts serving traffic.

Recommended production sequence:

```txt
Backup database
Deploy backend code
Run flask --app run db upgrade
Restart backend service
Verify health check
```

For high-risk migrations, test the migration against a copy of production data first.

## Notes For This Project

- Keep migration files in git.
- Do not edit old migrations after they have been shared or deployed.
- Create a new migration for new changes.
- Keep model changes and migration files in the same commit.
- Use clear migration messages, such as `create users table` or `add member status index`.
