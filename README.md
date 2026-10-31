<div align="center">

<img src="public/brand/app-icon.png" alt="Proove" width="120" />

# Proove

**A cosy, self-hosted recipe manager and meal planner.**
Scale recipes, plan multi-dish meals against a countdown timeline, and keep it all on your own server.

</div>

---

## Features

- **Recipes**: ingredients, method, tools, oven temperature, and prep / cook / chill / cool / prove times, with a photo or an emoji.
- **Serving scaler**: change the servings and every quantity rescales (understands `1 1/2`, `¾`, etc.).
- **Cooking mode**: tick off ingredients as you go; the screen stays awake while you cook.
- **Cook log**: record each time you make a recipe, with notes.
- **Meals**: group several recipes, set a "ready by" time, and build a timeline of tasks that you check off as you cook. A little celebration when you finish.
- **Live sync**: open the same recipe or meal on two devices and edits appear on both.
- **Import / export**: share recipes as `.recipe` files and meals as `.meal` files (images embedded), or export a recipe as a printable **PDF**.
- **Search** across titles *and* ingredients.
- **Installable PWA**: add it to your phone's Home Screen for a full-screen, app-like experience.
- **Tiny footprint**: one container, one SQLite file. No accounts, no external services, no environment variables required.

## Install

Pick whichever suits you. All options serve the app on port **3103** (Docker / Home Assistant) or **3000** (local development).

### Option 1: Docker Compose (recommended)

A multi-arch image (`amd64` and `arm64`) is published to GitHub Container Registry on every push to `main`.

1. Save [`docker-compose.yml`](docker-compose.yml) somewhere on your server.
2. Edit the two host paths under `volumes` to folders you own:

   ```yaml
   volumes:
     - ./data:/app/data               # SQLite database
     - ./uploads:/app/public/uploads  # uploaded photos
   ```

   The container runs as UID/GID `1000:1000`, so make sure that user can write to those folders:

   ```bash
   mkdir -p data uploads && sudo chown 1000:1000 data uploads
   ```

3. Start it:

   ```bash
   docker compose up -d
   ```

4. Open <http://localhost:3103> (or `http://<server-ip>:3103`).

To change the port, edit the left-hand number in `ports` (e.g. `"8080:3103"`).

**Updating:**

```bash
docker compose pull && docker compose up -d
```

The database schema is created on first start and upgraded automatically on later updates; existing data is never overwritten.

### Option 2: Home Assistant add-on

1. In Home Assistant go to **Settings → Add-ons → Add-on Store → ⋮ → Repositories**.
2. Add `https://github.com/realmuel/proove` and click **Add**.
3. Install **Proove**, start it, and click **Open Web UI** (or browse to `http://<ha-host>:3103`).

Data and photos are stored in the add-on's persistent `/data` volume and are included in Home Assistant backups.

### Option 3: Run from source

Requires Node.js 20+ (22 recommended).

```bash
git clone https://github.com/realmuel/proove.git
cd proove
npm install
npm run db:migrate   # creates ./sqlite.db
npm run dev          # http://localhost:3000
```

For a production build:

```bash
npm run build
npm run db:migrate
npm start            # http://localhost:3000
```

## Using Proove

### Add a recipe

1. Tap **+** on the home screen and choose **New recipe**.
2. Give it a title, servings, and an author. Add ingredients, method steps and tools, plus optional times and oven temperature.
3. Add a photo (drag to choose the focal point) or pick an emoji instead.
4. Save. Open the recipe any time and use the **servings stepper** to scale it.

### Plan a meal

1. Choose **New meal**, name it, and attach the recipes that make up the meal.
2. Set a **ready-by** time and add timeline entries (`HH:MM` plus what to do, optionally linked to a recipe).
3. On the day, open the meal and tick tasks off as you go. Everyone viewing the meal sees progress live.

### Import and export

| Want to... | Do this |
|---|---|
| Share a recipe | Open it → **Export** → *Recipe file* (`.recipe`) or *PDF* |
| Share a meal | Open it → **Export** → *Meal file* (`.meal`) |
| Import | On the home screen use the **import** button and pick a `.recipe`, `.meal`, `.json` or `.txt` file |

Exports embed the photo, so a single file is all you need to move a recipe between installs.

### Import recipes from websites with Claude

You can turn any recipe web page into an importable file using a Claude Project. The ready-made instructions are in [`docs/recipe-importer-project.md`](docs/recipe-importer-project.md): paste them into a project's custom instructions, send it a URL, and import the JSON it returns.

### Install as an app (PWA)

Open Proove in your phone's browser and choose **Add to Home Screen** (Safari: Share → Add to Home Screen). Serve it over HTTPS (e.g. behind a reverse proxy) for the best experience.

## Configuration

Proove works with no configuration. These are optional:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_PATH` | `sqlite.db` (`/app/data/sqlite.db` in Docker) | Location of the SQLite file |
| `PORT` | `3000` dev / `3103` Docker | HTTP port |

**Backups:** copy the database file and the uploads folder. That's everything.

**Security note:** Proove has no login. Run it on a trusted network, or put it behind a reverse proxy that handles authentication if you expose it to the internet.

## Development

```bash
npm run dev         # dev server with hot reload
npm run build       # production build
npx tsc --noEmit    # type-check
npx eslint .        # lint
```

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · SQLite via better-sqlite3 + Drizzle ORM · sharp (image processing) · @react-pdf/renderer (PDF export).

**Changing the schema:** edit [`src/db/schema.ts`](src/db/schema.ts), then generate a migration with `npx drizzle-kit generate` and commit the new files in `drizzle/`. Migrations are applied automatically at container start.

```
src/
  app/          pages, API routes (/api/recipes, /api/meals, ...)
  components/   UI components
  db/           Drizzle schema + connection
  lib/          formatting, import/export, PDF, realtime events
drizzle/        SQL migrations
scripts/        migrate.cjs (runs at container start)
proove/         Home Assistant add-on manifest
docs/           design guidelines and project notes
```

More notes in [`docs/`](docs): [design guidelines](docs/design-guidelines.md) and a [push-notification design](docs/push-notifications.md) (planned, not built).

## Releases

Every push to `main` triggers [`docker.yml`](.github/workflows/docker.yml), which bumps the add-on version, builds `linux/amd64` + `linux/arm64` images, and publishes them to `ghcr.io/realmuel/proove` (`latest`, a version tag, and a commit-SHA tag).
