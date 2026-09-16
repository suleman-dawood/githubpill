import { defineConfig } from "vitest/config";

// Load local credentials for opt-in integration runs. A missing .env is fine;
// the ambient environment is used instead.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file
}

/**
 * Integration tests talk to real providers (an API key or an installed agentic
 * CLI) and are excluded from `npm test`. Run them with `npm run test:integration`;
 * providers without credentials are skipped.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    testTimeout: 180_000,
    hookTimeout: 60_000,
  },
});
