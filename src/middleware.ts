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
  const isVercelDomain = hostname.endsWith("vercel.app");
  
  if (isDevelopment) {
    const parts = hostname.split(":");
    const hostWithoutPort = parts[0];
    const hostParts = hostWithoutPort.split(".");
    if (hostParts.length > 1) {
      subdomain = hostParts[0];
    }
  } else if (isVercelDomain) {
    // E.g. school-name.project-name.vercel.app -> parts length is 4
    // E.g. project-name.vercel.app -> parts length is 3 (no school subdomain)
    const hostParts = hostname.split(".");
    if (hostParts.length > 3) {
      subdomain = hostParts[0];
    }
  } else {
    // Custom domain e.g. schoolname.schoolpro.ug -> parts length is 3
    const hostParts = hostname.split(".");
    if (hostParts.length > 2 && hostParts[0] !== "www") {
      subdomain = hostParts[0];
    }
  }

  // Apply query parameter overrides if present (very useful for Vercel preview URLs)
  if (adminParam === "true") {
    subdomain = "admin";
  } else if (schoolParam) {
    subdomain = schoolParam;
  }

  // Rewrite routes based on subdomain
  if (subdomain === "admin") {
    url.pathname = `/super-admin${path}`;
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
