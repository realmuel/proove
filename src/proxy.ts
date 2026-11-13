import { NextResponse, type NextRequest } from "next/server";

/* Guards for an app with no login that lives on a home network:
   - Host must look like a LAN address (IP, localhost, bare hostname, .local /
     .lan / .home.arpa), or be listed in ALLOWED_HOSTS (comma-separated). This
     blocks DNS-rebinding, where a public domain is pointed at your LAN IP.
   - Browser-sent unsafe requests must come from the same origin, which stops
     other websites from posting to the app (CSRF).
   - Request bodies are capped (imports embed images, so this is generous). */

const MAX_BODY = 30 * 1024 * 1024;
const extra = (process.env.ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function hostAllowed(hostHeader: string): boolean {
  const host = hostHeader.toLowerCase().replace(/:\d+$/, "");
  if (extra.includes(host)) return true;
  return (
    /^\[[0-9a-f:.]+\]$/.test(host) || // IPv6 literal
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || // IPv4 literal
    !host.includes(".") || // localhost, bare LAN hostnames
    /\.(local|lan|home\.arpa)$/.test(host)
  );
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (!hostAllowed(host)) return new NextResponse("Forbidden host", { status: 403 });

  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== host) {
      return new NextResponse("Cross-origin request blocked", { status: 403 });
    }
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) {
      return new NextResponse("Body too large", { status: 413 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/((?!_next/).*)" };
