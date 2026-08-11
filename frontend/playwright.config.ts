import { defineConfig, devices } from 'playwright/test'

// End-to-end tests run the REAL frontend+backend pair (no mocked booking APIs).
// The config starts both servers via Playwright webServer.
//
// Env overrides:
// - E2E_BACKEND_CMD: command to start the backend (CI uses `python -m uvicorn ...`)
// - E2E_BASE_URL: frontend URL if it differs from http://localhost:5173

const FRONTEND_PORT = 5173
const BACKEND_PORT = 8000

const frontendUrl = process.env.E2E_BASE_URL ?? `http://localhost:${FRONTEND_PORT}`
const backendCmd =
  process.env.E2E_BACKEND_CMD ??
  `.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: backendCmd,
      cwd: '../backend',
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      // strictPort: fail loudly instead of silently moving to 5174 (backend CORS
      // only allows localhost:5173).
      command: `npm run dev -- --strictPort`,
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        VITE_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
})