import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma CLI doesn't auto-load .env.local; load it first, then fall back to .env.
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
