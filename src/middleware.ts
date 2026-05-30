import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const path = url.pathname;

  // Skip static assets, favicon, and Next.js internals
  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path.includes(".") ||
    path.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Check query parameter fallback for Vercel demo testing
  const schoolParam = url.searchParams.get("school");
  const adminParam = url.searchParams.get("admin");

  // Parse subdomain from hostname
  let subdomain = "";
  const isDevelopment = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  
  if (isDevelopment) {
    const parts = hostname.split(":");
    const hostWithoutPort = parts[0];
    const hostParts = hostWithoutPort.split(".");
    if (hostParts.length > 1) {
      subdomain = hostParts[0];
    }
  } else {
    const hostParts = hostname.split(".");
    if (hostParts.length > 2 && hostParts[0] !== "www") {
      subdomain = hostParts[0];
    }
  }

  // Apply query parameter overrides if present
  if (adminParam === "true") {
    subdomain = "admin";
  } else if (schoolParam) {
    subdomain = schoolParam;
  }

  // Rewrite routes based on subdomain
  if (subdomain === "admin") {
    url.pathname = `/super-admin${path}`;
    // Keep search params for testing overrides
    return NextResponse.rewrite(url);
  }

  if (subdomain && subdomain !== "www") {
    url.pathname = `/school/${subdomain}${path}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|static|[\\w-]+\\.\\w+).*)"],
};
