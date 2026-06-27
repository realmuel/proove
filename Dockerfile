# syntax=docker/dockerfile:1

# ---------- Builder: install dependencies and build the app ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Toolchain so node-gyp can build the better-sqlite3 native addon if no
# matching prebuilt binary is available for this platform.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first so this layer is cached unless the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# Build the production bundle.
COPY . .
RUN npm run build

# ---------- Runner: slim image that serves the build ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The database and uploads live on mounted volumes — no other config required.
ENV DATABASE_PATH=/app/data/sqlite.db
ENV PORT=3103
ENV HOSTNAME=0.0.0.0

# Build output plus the directories the server reads at runtime: PDF fonts,
# the Drizzle migrations used to seed a fresh database, and uploaded images.
# node_modules is copied from the builder so the Linux-compiled native modules
# (better-sqlite3, sharp) come along.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/pdf-fonts ./src/lib/pdf-fonts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Volume mount points (also created lazily at runtime, but make them explicit).
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3103

# Create/upgrade the database (no-op if it already exists), then start Next.
CMD ["sh", "-c", "node scripts/migrate.cjs && node node_modules/next/dist/bin/next start -p 3103 -H 0.0.0.0"]
