# syntax=docker/dockerfile:1

# ---------- Builder: compile the app on the *build* machine's native arch ----------
# The Next.js output is plain JS, so it's identical for every target platform.
# Pinning this stage to $BUILDPLATFORM keeps the slow `next build` off QEMU.
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Deps: production node_modules for the *target* arch ----------
# Native modules (better-sqlite3, sharp) must match the image's platform. This
# layer only depends on the lockfile, so it's cached and rarely re-runs.
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Toolchain so node-gyp can build better-sqlite3 if no prebuilt binary matches.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Runner: slim image that serves the standalone build ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The database and uploads live on mounted volumes — no other config required.
ENV DATABASE_PATH=/app/data/sqlite.db
ENV PORT=3103
ENV HOSTNAME=0.0.0.0

# Standalone server: server.js plus only the traced node_modules. (Its own
# copy of the project sources is ignored; we take just what runs.)
COPY --from=builder /app/.next/standalone/server.js ./server.js
COPY --from=builder /app/.next/standalone/package.json ./package.json
COPY --from=builder /app/.next/standalone/.next ./.next
COPY --from=builder /app/.next/standalone/node_modules ./node_modules
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Runtime-read files: PDF fonts and the migrations used to seed a database.
COPY --from=builder /app/src/app/fonts ./src/app/fonts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Overlay the packages with native code (and the migrator's drizzle-orm, which
# the standalone trace bundles away) from the target-arch deps stage, so the
# builder's native-arch binaries never reach the image.
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/sharp ./node_modules/sharp
COPY --from=deps /app/node_modules/@img ./node_modules/@img

# Volume mount points (also created lazily at runtime, but make them explicit).
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3103

# Create/upgrade the database (no-op if it already exists), then start Next.
# Under Home Assistant the Supervisor mounts persistent storage at /data; if it
# exists, keep the database and uploads there. Plain Docker never has /data.
CMD ["sh", "-c", "if [ -d /data ]; then export DATABASE_PATH=/data/sqlite.db; mkdir -p /data/uploads; rm -rf /app/public/uploads; ln -s /data/uploads /app/public/uploads; fi; node scripts/migrate.cjs && exec node server.js"]
