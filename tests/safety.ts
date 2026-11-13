/** Refuse to run destructive tests against anything that could be real data. */
export function assertSafeTestDatabase(url: string | undefined) {
  if (!url) throw new Error("TEST_DATABASE_URL is not set. Integration tests need a throwaway database.");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const separateSchema = /[?&]schema=test(&|$)/.test(url);
  if (!local && !separateSchema) {
    throw new Error('Refusing to run: TEST_DATABASE_URL must point at localhost or include "schema=test".');
  }
}
