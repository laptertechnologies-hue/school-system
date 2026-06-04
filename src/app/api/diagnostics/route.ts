import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import dns from "dns";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    databaseUrlPresent: !!process.env.DATABASE_URL,
    databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
    databaseUrlStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + "..." : "",
    nodeVersion: process.version,
    envKeys: Object.keys(process.env).filter(k => !k.includes("KEY") && !k.includes("PASSWORD") && !k.includes("SECRET") && !k.includes("AUTH")),
    prismaStatus: "unknown",
    prismaError: null as string | null,
    prismaStack: null as string | null,
    dnsTest: "unknown",
    dnsError: null as string | null,
  };

  // Test DNS resolution of neon database
  if (process.env.DATABASE_URL) {
    try {
      const dbUrl = process.env.DATABASE_URL;
      let host = "";
      const match = dbUrl.match(/@([^/:]+)/);
      if (match) {
        host = match[1];
      }
      if (host) {
        result.dbHost = host;
        await new Promise((resolve, reject) => {
          dns.lookup(host, (err: any, address: string) => {
            if (err) reject(err);
            else resolve(address);
          });
        });
        result.dnsTest = "resolved";
      } else {
        result.dnsTest = "invalid host pattern";
      }
    } catch (err: any) {
      result.dnsTest = "failed";
      result.dnsError = err.message || String(err);
    }
  }

  // Test Prisma Client connection query
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    result.prismaStatus = `connected (${Date.now() - start}ms)`;
  } catch (err: any) {
    result.prismaStatus = "failed";
    result.prismaError = err.message || String(err);
    result.prismaStack = err.stack || null;
  }

  return NextResponse.json(result);
}
