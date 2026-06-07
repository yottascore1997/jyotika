import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
