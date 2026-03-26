import dotenv from 'dotenv';

dotenv.config();

// Ensure Prisma always has DATABASE_URL, while allowing Vercel-style WS_* env names.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.WS_DATABASE_URL ||
    process.env.WS_POSTGRES_URL ||
    process.env.WS_PRISMA_DATABASE_URL ||
    process.env.DATABASE_URL;
}
