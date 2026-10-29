import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: { baseURL: process.env.UI_VERIFY_URL || "http://127.0.0.1:4173/CourseGUI/", channel: process.platform === "win32" ? "msedge" : undefined, viewport: { width: 1440, height: 1000 }, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: process.env.UI_VERIFY_URL ? undefined : { command: "node scripts/serve-preview.cjs", url: "http://127.0.0.1:4173/CourseGUI/", reuseExistingServer: !process.env.CI },
});
