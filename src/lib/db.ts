import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  try {
    if (!process.env.DATABASE_URL) {
      // Return a dummy client that will fail gracefully on queries
      // This prevents the module from crashing at import time
      console.warn("DATABASE_URL not set — Prisma will not connect to any database.");
    }
    return new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["query"],
    });
  } catch (err) {
    console.error("Failed to create PrismaClient:", err);
    // Return a proxy that throws on any method call
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "$queryRaw" || prop === "$executeRaw" || prop === "$connect" || prop === "$disconnect") {
          return async () => { throw new Error("PrismaClient failed to initialize — DATABASE_URL may be invalid."); };
        }
        // Return a proxy for model access (e.g. prisma.user.findFirst)
        return new Proxy({}, {
          get() {
            return async () => { throw new Error("PrismaClient failed to initialize — DATABASE_URL may be invalid."); };
          }
        });
      }
    });
  }
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
