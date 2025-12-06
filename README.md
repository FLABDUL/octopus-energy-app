# Smart Energy Insights (React + Vite)

This repository is a small React app (Vite) that fetches energy consumption data from Octopus Energy and generates AI-powered insights using Anthropic's Claude models. The project includes a small local proxy to forward AI requests server-side so your API keys remain secret.

**This README explains how to run the app locally (Windows / PowerShell).**

**Prerequisites**
- **Node 18+**: required for built-in `fetch` in the server. If you use an older Node, you may need to install `node-fetch`.
- **npm**: included with Node.

**Quick Start (development)**

- Clone the repo and install root dependencies:

	```powershell
	git clone <repo-url>
	cd octopus-energy-app
	npm install
	```

- Create a frontend environment file at the project root named `.env.local` and add your keys and meter details (do NOT commit this file). Example contents:

	```text
	VITE_OCTOPUS_API_KEY=sk_live_...
	VITE_ANTHROPIC_API_KEY=sk-ant-...
	VITE_ACCOUNT_NUMBER=A-12345678
	VITE_ELECTRIC_MPAN=1234567890123
	VITE_ELECTRIC_SERIAL=12A3456789
	VITE_GAS_MPRN=1234567890
	VITE_GAS_SERIAL=G4A1234567
	```

- **Start both frontend and server with one command (from project root):**

  ```powershell
  npm install
  $env:ANTHROPIC_API_KEY='sk-ant-...'; npm run dev:all
  ```
  This runs the Vite dev server (port 5173) and Anthropic proxy (port 3001) concurrently.

- **Or, start them separately:**

  - Terminal 1 (server proxy):
    ```powershell
    cd server
    npm install
    # Create server/.env from example (copy and fill in your key)
    cp .env.example .env
    # Then start the proxy (it reads ANTHROPIC_API_KEY from server/.env or env var)
    npm start
    ```

  - Terminal 2 (frontend from project root):
    ```powershell
    cd ..\
    npm run dev
    ```

- Open the app at `http://localhost:5173`. The frontend is configured to proxy `/api/*` to `http://localhost:3001` (the local proxy).**Notes & Troubleshooting**
- Do not commit `.env.local` or `server/.env` — these contain secrets. The repository `.gitignore` already excludes `.env*` files.
- If you change `.env.local`, restart the Vite dev server so `import.meta.env` picks up the new values.
- If you see a browser CORS error when calling Anthropic directly, it's expected — Anthropic does not allow arbitrary browser origins. Use the provided server proxy.
- If the UI shows "Unable to generate AI insights" or a 4xx/5xx error, check:
	- Browser DevTools → Network for `POST /api/anthropic` and the response body.
	- The proxy terminal for server logs and errors.

**Security**
- Keep API keys secret. Use the server proxy or a hosted serverless function for production. Rotate keys if they are accidentally committed.

If you want, I can add a `server/.env.example` and a root `dev` script to run both proxy + frontend concurrently. Let me know which you'd prefer.
