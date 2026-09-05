import { defineConfig } from "vitest/config";

// Used only when this package is built standalone in the public mirror repo
// (github.com/peppol-sh/peppol-sh-ts). Inside the monorepo the root
// vitest.config.ts governs, via its `unit` project.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
