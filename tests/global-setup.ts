import { execSync } from "child_process";
import { assertSafeTestDatabase } from "./safety";

// Sync the schema into the test database/schema. No --force-reset: each test clears its own rows (tests/helpers.ts).
export default function setup() {
  const url = process.env.TEST_DATABASE_URL!;
  assertSafeTestDatabase(url);
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
}
