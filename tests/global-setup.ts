import { execSync } from "child_process";

// Sync the schema into the separate SQLite test database (never touches dev.db).
// No --force-reset: each test clears its own rows with resetDb() in tests/helpers.ts.
export default function setup() {
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
}
