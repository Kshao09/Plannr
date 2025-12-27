// prisma.config.ts
import { defineConfig } from "prisma/config";
import { config as dotenv } from "dotenv";

// ✅ load your custom env file
dotenv({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ✅ Prisma v7: datasource URL lives here (not in schema.prisma)
    url: process.env.DATABASE_URL!,
  },
});
