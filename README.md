# Stormee
Stormhacks 2025
## Stormee Electron + React + Three.js (TypeScript)

A minimal Electron desktop app scaffolded with Vite + React + Three.js that renders a spinning cube.

### Prerequisites

- Node.js 18+

### Install

```bash
npm install
```

### Development

Runs Vite dev server, builds Electron main/preload in watch mode, and launches Electron once the renderer is ready.

```bash
npm run dev
```

### Build

Builds renderer with Vite and main/preload with esbuild, then you can run Electron on the output.

```bash
npm run build
npm start
```

### Project Structure

- `electron/main.ts`: Electron main process.
- `electron/preload.ts`: Preload script with `contextIsolation` on.
- `src/ui/SpinningCube.tsx`: Three.js scene in React.
- `src/ui/App.tsx`: App root.
- `src/main.tsx`: React entry.

### Notes

- In dev, the app loads `http://localhost:5173` from Vite.
- In production, it loads the built `dist/index.html`.