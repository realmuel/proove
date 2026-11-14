import { NextResponse, type NextRequest } from "next/server";

/* Guards for an app with no login:
   - Browser-sent unsafe requests must come from the same origin (CSRF).
   - Request bodies are capped (imports embed images, so this is generous).
   ponytail: no Host allow-list (it 403'd Home Assistant / reverse-proxy hostnames);
   re-add a DNS-rebinding check if the app is ever exposed beyond a trusted network. */

const MAX_BODY = 30 * 1024 * 1024;

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";

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
