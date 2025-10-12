# Webcells: Cellular Automata Exploration Sandbox

Webcells is an interactive sandbox for exploring continuous cellular automata on a toroidal topology. It features a real‑time 2D grid, a 3D torus projection, and live information‑theoretic metrics (entropy, spatial entropy, pattern complexity). Built with Next.js, React Three Fiber, and TypeScript, it leverages GPU compute for large grids and smooth evolution.

This is not classic Conway's Game of Life. The core update rule is a SmoothLife‑style, continuous‑valued automaton computed on the GPU with a ring neighborhood and tunable thresholds. Conway patterns (e.g., "glider") are provided only as convenient initial conditions.

## Features

- Continuous cellular automaton on a toroidal grid (wrap‑around edges)
- GPU‑accelerated evolution via a fragment shader for real‑time performance
- Dual visualization:
  - 2D grid view with per‑cell coloring by state
  - 3D torus view mapping the toroidal grid into 3D space
- Live metrics and visualization:
  - Global entropy over time (graph)
  - Alive ratio, spatial entropy, pattern complexity (stats panel)
- Interactive controls: grid size, simulation speed, and "Inject Entropy" perturbations
- Initial configuration presets: random, glider, empty
- Responsive layout; TypeScript throughout

## How it works

- Toroidal topology: sampling uses wrap‑around addressing so patterns seamlessly cross edges.
- Update rule: a SmoothLife‑like ring neighborhood drives birth/death using continuous thresholds. Key shader parameters include:
  - `innerR`, `outerR`: inner/outer radii of the ring
  - `birthLow`, `birthHigh`, `deathLow`, `deathHigh`: threshold bands
- GPU compute: a fragment shader evolves the state texture each step, then the CPU reads back the texture to update metrics and visualizations.

Relevant implementation files:

- `src/app/components/GameOfLife.tsx` – simulation step, GPU setup, stats, 2D instanced rendering
- `src/app/components/TorusView.tsx` – 3D torus instanced rendering and hover highlight
- `src/app/components/EntropyGraph.tsx` – entropy‑over‑time plot
- `src/app/components/EntropyStats.tsx` – live metrics panel
- `src/app/components/ControlPanel.tsx` – grid size, speed, and perturbation controls
- `src/app/components/InitialConfigTool.tsx` – initial condition presets
- `src/app/utils/entropyCalculations.ts` – spatial entropy and pattern complexity
- `src/app/utils/gpuCompute.ts` – re‑export of Three.js GPUComputationRenderer

## Getting started

Prerequisites:

- Node.js 18+ and npm

Install and run:

```bash
git clone <this-repo-url>
cd webcells
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

Production build:

```bash
npm run build
npm start
```

## Using the sandbox

- Grid Size: adjust the simulation resolution (higher = more detail; heavier)
- Speed: control update frequency (steps per second)
- Inject Entropy: randomly flips a fraction of cells to perturb dynamics
- Initial Config: choose `random`, `glider`, or `empty` as the starting state
- Hover: moving the pointer over the 2D grid highlights the corresponding point on the 3D torus
- Entropy Graph: watch global entropy evolve over time (0 at uniform states; higher with mixed states)

## Tech stack

- Next.js 15, React 19, TypeScript 5
- three.js with React Three Fiber and Drei
- GPUComputationRenderer for compute on the GPU

## Ideas & roadmap

- Expose rule parameters (`innerR`, `outerR`, thresholds) in the UI with presets
- Pause/step controls; time dilation
- Save/load initial states and parameter sets
- Enhanced pattern tools and overlays; export snapshots/video
- Performance tuning for very large grids (tiling, partial reads)

## Acknowledgements

- Inspired by continuous cellular automata such as SmoothLife
- Conway's Game of Life acknowledged as a historical precursor; used here only for a sample starting pattern
