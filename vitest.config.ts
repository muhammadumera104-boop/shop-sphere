import { defineConfig } from "vitest/config";
import path from "path";

// Integration tests wipe tables, so they NEVER use the app's DATABASE_URL (your real data).
// They run only when TEST_DATABASE_URL is set and points at a throwaway target:
// a localhost database, or a URL containing "schema=test" (a separate schema in the same database).
// Unit tests need no database and always run.
const testUrl = process.env.TEST_DATABASE_URL;
const dummy = "postgresql://unused:unused@localhost:5432/unused";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts", ...(testUrl ? ["tests/integration/**/*.test.ts"] : [])],
    globalSetup: testUrl ? ["tests/global-setup.ts"] : [],
    env: { DATABASE_URL: testUrl ?? dummy, DIRECT_URL: testUrl ?? dummy },
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 180000,
  },
});
