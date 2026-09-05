import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SDK_VERSION } from "../client";

// Resolved from this file, not from `process.cwd()`, so the guard holds in the
// monorepo (run from the repo root) and standalone in the public mirror repo.
const here = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(here, "../../package.json");

describe("SDK_VERSION", () => {
  it("matches the version in package.json", () => {
    const { version } = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      version: string;
    };

    expect(
      SDK_VERSION,
      "SDK_VERSION in src/client.ts drifted from package.json — bump both",
    ).toBe(version);
  });
});
