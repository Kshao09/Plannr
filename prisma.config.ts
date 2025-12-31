// prisma.config.ts
import { defineConfig } from "prisma/config";
import { config as dotenv } from "dotenv";

dotenv({ path: ".env" });
dotenv({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts", // ✅ add this
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
