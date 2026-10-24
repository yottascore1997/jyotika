import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";

// Ensure DATABASE_URL is available even if dev server started before .env existed
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const idx = trimmed.indexOf("=");
          if (idx !== -1) {
            const k = trimmed.slice(0, idx).trim();
            let v = trimmed.slice(idx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            if (!process.env[k]) {
              process.env[k] = v;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Could not load .env in db.ts:", err);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient & { _initializedWithUrl?: string };
};

const currentDbUrl = process.env.DATABASE_URL;

if (
  !globalForPrisma.prisma ||
  globalForPrisma.prisma._initializedWithUrl !== currentDbUrl
) {
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {}
  }
  const client = new PrismaClient({
    datasources: currentDbUrl ? { db: { url: currentDbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }) as PrismaClient & { _initializedWithUrl?: string };
  client._initializedWithUrl = currentDbUrl;
  globalForPrisma.prisma = client;
}

export const prisma = globalForPrisma.prisma;

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1008", "P1017", "P2024"]);

export function isPrismaConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Server has closed the connection") ||
    message.includes("Connection lost") ||
    message.includes("ECONNRESET") ||
    message.includes("Can't reach database server")
  );
}

async function reconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch {
    // ignore disconnect errors on stale connections
  }
  await prisma.$connect();
}

/** Retry transient DB connection drops (common with remote MySQL e.g. Railway). */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isPrismaConnectionError(error) || attempt === retries - 1) {
        throw error;
      }
      await reconnectPrisma();
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError;
}
