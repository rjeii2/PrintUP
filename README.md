# PrintUP SketchUp-like Browser Modeler

## Architecture
- `src/App.tsx`: interaction layer, grouped toolbar, status bar, inspector, toasts, tool orchestration.
- `src/core/tools.ts`: tool-state transitions and sketch primitives.
- `src/core/inference.ts`: axis lock + endpoint/midpoint inference.
- `src/core/kernel.ts`: kernel adapter contract + local `SimpleKernel` implementation.
- `src/core/commands.ts`: command history (undo/redo).
- `src/core/autoflat.ts`: candidate scoring + Z=0 flattening.
- `src/core/exporters.ts`: STL/3MF generation + mesh validation.

## Local development
```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## Keyboard shortcuts
- `R` Rectangle
- `L` Line
- `C` Circle
- `P` Polygon
- `U` Push/Pull
- `M` Move
- `O` Orbit
- `H` Pan
- `Z` Zoom
- `Enter` confirm current tool
- `Esc` cancel current tool

## QA exit criteria used
- Typecheck passes (`tsc --noEmit`)
- Lint passes (`eslint .`)
- Unit tests pass (`vitest`)
- E2E-style regression smoke passes (`vitest tests/smoke...`)
- Build succeeds (`vite build`)

## Known limitations
- This revision is still a lightweight kernel mock; OCCT WASM adapter can be slotted into `KernelAdapter` for robust B-Rep booleans/splits.
- Draw tools beyond rectangle currently share an MVP sketch profile path.
- 3MF output is minimal XML model, not full OPC zipped package.

## Release Notes
- Polished SketchUp-simple UI with grouped toolbar, inspector, status bar, measurement field, theming, and toast notifications.
- Added accessibility and interaction fidelity improvements (hotkeys, escape/enter behavior, active/disabled states, ARIA labels).
- Improved robustness with export validation warnings, kernel failure guards, and auto-flat preview/confirm flow.
- Expanded automated tests for inference snaps, tool state transitions, auto-flat transform, export validity, and integrated box/camera/autoflat smoke flows.
