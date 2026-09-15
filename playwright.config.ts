import { defineConfig, devices } from "@playwright/test";
import path from "path";
import fs from "fs";

const localChromiumPath = path.join(
  process.env.LOCALAPPDATA || "",
  "ms-playwright",
  "chromium-1243",
  "chrome-win64",
  "chrome.exe"
);

const executablePath = fs.existsSync(localChromiumPath) ? localChromiumPath : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      executablePath: executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
