# Push notifications for meal timeline actions

**Status:** designed, not built.
**Goal:** send a push notification ~30 seconds before the next meal timeline
action is due, on a PWA installed to the iOS Home Screen.

## What iOS allows (the constraints that shape everything)

iOS supports Web Push from **16.4+**, but with hard rules:

- **Installed PWA only.** The user must "Add to Home Screen." Push does not work
  in a Safari tab — no permission prompt, no API. So the enable/disable toggle
  is gated to standalone display mode; outside it, the feature can't exist.
- **The notification must come from a server.** iOS does **not** support
  client-scheduled notifications (no `Notification Triggers`). A timer in the
  page or service worker will not fire when the app is closed. The only way to
  wake a closed PWA is a real Web Push sent **from the server at the right
  moment**.
- **HTTPS required**, and the permission prompt must come from a user tap.

Upside: once subscribed, the notification fires even when the app is fully
closed — exactly what we want for "get the turkey out" while you're away.

## Architecture

```
Service worker (push + notificationclick handlers)
        ▲ Web Push (VAPID)
        │
Server scheduler (in Next, via instrumentation.ts)
   every ~10s: find timeline items due in ~30s, not done, not yet sent
              → push to that meal's subscribers
        │
   push_subscriptions table  ←── meal-page toggle subscribes THIS device to THIS meal
```

### Data model

```
push_subscriptions
  id          text pk
  mealId      text          -- per-meal scope
  endpoint    text          -- the browser's push endpoint
  p256dh      text          -- subscription keys
  auth        text
  createdAt   timestamp
  -- unique on (mealId, endpoint)

meal_timeline  (add one column)
  notifiedAt  timestamp null  -- set when the ~30s-before push has fired
```

`notifiedAt` prevents double-sends and survives server restarts. It resets
naturally because the meal `PUT` recreates timeline rows wholesale on any edit.

**Per-meal scoping nuance:** a browser has only **one** push endpoint per
origin. "Per meal" is enforced server-side by mapping that one endpoint to
multiple `mealId` rows. Enabling on meals A and B = same endpoint, two rows.
Disabling A deletes its row but keeps the `pushManager` subscription alive for
B; only call `subscription.unsubscribe()` when the device has zero remaining
rows.

### Files to add / change

| File | Role |
|---|---|
| `public/sw.js` | Service worker: `push` → `showNotification`, `notificationclick` → open `/meal/<id>` |
| `src/lib/push.ts` | Configures `web-push` from env, exports `sendToMeal()` + VAPID public key |
| `src/app/api/push/subscribe/route.ts` | `POST` (upsert {mealId, subscription}) / `DELETE` (remove row) |
| `src/lib/pushScheduler.ts` | The due-item query + send loop |
| `src/instrumentation.ts` | Next's `register()` starts the loop (guarded on `globalThis`) |
| `src/components/MealNotifyToggle.tsx` | PWA-gated enable/disable toggle |
| `src/app/meal/[id]/MealClient.tsx` | Renders the toggle + registers the SW |
| `.env.local` | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (gitignored) |

Plus `web-push` (+ `@types/web-push`) in `package.json`, and a one-time
`npx web-push generate-vapid-keys`.

### The scheduler

A `setInterval` (~every 10s) launched from `instrumentation.ts`. Each tick:

1. `now = Date.now()`.
2. Find meals that have ≥1 subscription **and** an `etaAt`.
3. For each not-done timeline item with `notifiedAt = null` and a non-empty
   `time`:
   - resolve `HH:MM` against the meal's ETA **date** → `dueAt`;
     `fireAt = dueAt − 30s`.
   - if `fireAt ≤ now < dueAt + grace` → push to all that meal's subscriptions,
     set `notifiedAt = now`.
4. On a `404/410` from the push service, delete that dead subscription row.

Payload: `{ title: meal.name, body: "17:30 · Start the potatoes", url: "/meal/<id>" }`.

### The toggle (PWA-only)

Render **only** when `matchMedia('(display-mode: standalone)').matches` (or
legacy `navigator.standalone`) **and** `PushManager`/`Notification` exist.
Enable flow, all from the user's tap: `Notification.requestPermission()` →
register SW → `pushManager.subscribe({ applicationServerKey })` →
`POST /api/push/subscribe`. If the meal has no ETA, show a "set an ETA first"
hint (no anchor = nothing to schedule).

## Performance

Negligible for a self-hosted personal app:

- Each tick is a couple of indexed `better-sqlite3` reads (synchronous,
  in-process, microsecond-range) and only does network work when something is
  actually due. 8,640 ticks/day each doing ~nothing is not load.
- `better-sqlite3` is synchronous, so keep the tick query scoped (only meals
  with subscriptions + an ETA) so it never blocks the event loop.
- It keeps the Node process from going fully idle and assumes a long-lived
  server (won't work on serverless/edge).

Optional optimisations if the poll ever bothers us:

1. **Lazy loop** — only run the interval while ≥1 subscription exists.
2. **Sleep-until-next** — compute the soonest `fireAt` across all meals and
   `setTimeout` exactly to it, rescheduling on timeline/subscription changes.
   Zero idle ticks, perfectly precise.

## Known edges to decide later

- **Timezone:** the server resolves `HH:MM` in *its* local time. Fine when phone
  and server share a timezone (typical self-host); otherwise store a tz offset
  on the meal.
- **Precision:** 10s tick → the ping lands 30–40s before. Tighten the tick (or
  use sleep-until-next) for closer.
- **Server must be awake** at fire time; a sleeping laptop won't send.

## iOS acceptance test (must run on a real device)

1. Deploy over **HTTPS**.
2. iPhone Safari → Share → **Add to Home Screen**.
3. Open the installed app → a meal with an ETA + timed task → **Enable
   notifications**, accept the prompt.
4. Set a task ~1 min out, **close the app**, expect a banner ~30s before.
