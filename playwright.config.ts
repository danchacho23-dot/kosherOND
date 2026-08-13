import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Tres pruebas e2e, no nueve: directorio, alta con aprobación de admin, y click
 * externo con atribución. Son los tres caminos que, si se rompen, dejan al
 * producto sin valor.
 *
 * El viewport por defecto es un celular: así se usa esto en la calle.
 * Requiere una base Postgres real en DATABASE_URL. Ver DEPLOYMENT.md.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    ...devices["Pixel 7"],
    baseURL,
    locale: "es-PA",
    timezoneId: "America/Panama",
    trace: "retain-on-failure",
    // Permite apuntar a un Chromium ya instalado en la máquina/imagen de CI en
    // lugar de que Playwright se baje el suyo.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
