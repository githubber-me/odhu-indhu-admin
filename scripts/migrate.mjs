import nextEnv from "@next/env";
import postgres from "postgres";
import { readFile } from "node:fs/promises";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in .env.local first.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(
      await readFile(new URL("../db/001_observability.sql", import.meta.url), "utf8"),
    );
  });
  console.log("Observability migration complete.");
} catch (error) {
  console.error(
    "Migration failed. Check the connection and database permissions; no credentials were printed.",
  );
  if (process.env.NODE_ENV === "development") console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
