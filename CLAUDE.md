# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing React components for the Vev design platform. Each top-level directory (except `.github`, `.git`, etc.) is an independent component package that can be developed and deployed separately.

## Common Commands

**Local development (run from component directory):**
```bash
yarn install
vev start          # Starts local dev server, opens component in Vev editor
```

**Linting (run from root):**
```bash
yarn run lint       # Note: lints 'packages' directory (legacy path)
```

**Deploy a component (run from component directory):**
```bash
vev deploy --token "$VEV_DEPLOY_TOKEN"
```

**Node version:** v22.14.0 (see `.nvmrc`)

## Architecture

### Component Structure

Each component directory contains:
- `package.json` - Component dependencies (uses `@vev/react`, `@vev/silke`, `@vev/utils`)
- `vev.json` - Vev platform config with unique `key` identifier
- `src/` - TypeScript/React source code
- `tsconfig.json` - TypeScript config with CSS modules plugin

### Vev Component Pattern

Components use `registerVevComponent()` from `@vev/react` to expose themselves to the Vev editor:

```typescript
import { registerVevComponent, useEditorState, useVevEvent, useDispatchVevEvent } from '@vev/react';

registerVevComponent(MyComponent, {
  name: 'Component Name',
  props: [...],           // Editor-configurable properties
  events: [...],          // Events the component can emit
  interactions: [...],    // Actions that can be triggered on the component
  editableCSS: [...],     // CSS properties exposed in editor
});
```

### Key Vev Hooks

- `useEditorState()` - Returns `{ disabled }` to detect editor vs. live mode
- `useVevEvent(eventType, handler)` - Listen for interaction triggers
- `useDispatchVevEvent()` - Emit events to other components
- `useTracking()` - Dispatch analytics events

### Component Categories

- **3D/Visual Effects:** aurora, Orb, Prism, Particles, Iridescence, galaxy, floating-lines
- **Media:** video, youtube, vimeo, lottie, spotify, soundcloud
- **Forms:** forms, forms-native
- **Embeds:** IFrame, google-forms, google-maps, typeform, hubspot-form

## CI/CD

GitHub Actions (`.github/workflows/deploy-to-merge-to-main.yml`) automatically deploys changed components to Vev on push to `main`. It:
1. Detects changed directories via `git diff`
2. Deploys each directory containing `vev.json`

## Code Style

- ESLint + Prettier with TypeScript
- Single quotes, trailing commas, 100 char line width
- CSS Modules for styling (`.module.css` files)
- Strict TypeScript mode
