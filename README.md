# Proove

A recipe and meal-planning app (Next.js, SQLite/Drizzle). Design notes are in `docs/`.

## Develop

```bash
npm install
npm run dev   # http://localhost:3000
```

## Run with Docker

No environment variables needed. `docker-compose.yml` pulls
`ghcr.io/realmuel/proove:latest` (built by `.github/workflows/docker.yml`):

```bash
docker compose up -d
```

Then open [http://localhost:3103](http://localhost:3103).

- Change the host port via the left-hand number in `ports`.
- The database (`/app/data`) and uploaded images (`/app/public/uploads`) are
  bind-mounted; edit the host paths in `docker-compose.yml`.
- On first start the database is created from the Drizzle migrations; an
  existing database is left untouched.
