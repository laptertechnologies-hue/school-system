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
    // Custom domain check (e.g. schoolname.portal.laptertech.store)
    const customBase = process.env.NEXT_PUBLIC_BASE_DOMAIN || "portal.laptertech.store";
    const baseDomains = [customBase, "portal.laptertech.store", "schoolpro.laptertech.store"];
    
    const matchingBase = baseDomains.find(base => hostname === base || hostname === `www.${base}`);
    
    if (matchingBase) {
      subdomain = "";
    } else {
      const matchingSuffix = baseDomains.find(base => hostname.endsWith(`.${base}`));
      if (matchingSuffix) {
        subdomain = hostname.replace(`.${matchingSuffix}`, "").replace("www.", "");
      } else {
        // Fallback for standard 2-level custom domains (e.g. schoolname.schoolpro.ug)
        const hostParts = hostname.split(".");
        if (hostParts.length > 2 && hostParts[0] !== "www") {
          subdomain = hostParts[0];
        }
      }
    }
  }

  // Apply query parameter overrides if present (very useful for Vercel preview URLs)
  if (adminParam === "true") {
    subdomain = "admin";
  } else if (schoolParam) {
    subdomain = schoolParam;
  }

  // Copy request headers to allow modification
  const requestHeaders = new Headers(req.headers);
  
  // Enforce correct Origin header for Server Actions on custom subdomains/rewrite paths
  if (req.method === "POST" && req.headers.has("next-action")) {
    const origin = `https://${hostname}`;
    requestHeaders.set("origin", origin);
  }

  // Rewrite routes based on subdomain
  if (subdomain === "admin") {
    url.pathname = `/super-admin${path}`;
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (subdomain && subdomain !== "www") {
    url.pathname = `/school/${subdomain}${path}`;
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next|static|[\\w-]+\\.\\w+).*)"],
};
