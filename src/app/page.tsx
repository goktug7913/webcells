'use client';
import { useState, useCallback } from 'react';
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import GameOfLife from "./components/GameOfLife";
import EntropyGraph from "./components/EntropyGraph";
import ControlPanel from "./components/ControlPanel";
import TorusView from "./components/TorusView";
import EntropyStats from "./components/EntropyStats";
import styles from './page.module.css';
import InitialConfigTool from './components/InitialConfigTool';
import { InitialConfigType } from './components/InitialConfigTool';

export default function Home() {
  const [entropyHistory, setEntropyHistory] = useState<number[]>([]);
  const [gridSize, setGridSize] = useState(100);
  const [speed, setSpeed] = useState(10);
  const [cells, setCells] = useState<number[]>([]);  // Changed from boolean[] to number[]
  const [stats, setStats] = useState({ entropy: 0, aliveRatio: 0, patternComplexity: 0, spatialEntropy: 0 });
  const [initialConfig, setInitialConfig] = useState<InitialConfigType>('random');
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [injectEntropyFn, setInjectEntropyFn] = useState<() => void>(() => {});

  const handleEntropyChange = useCallback((entropy: number) => {
    setEntropyHistory(prev => [...prev, entropy].slice(-100));
  }, []);

  const handleCellsUpdate = useCallback((newCells: number[]) => {  // Changed from boolean[] to number[]
    setCells(newCells);
  }, []);

  const handleStatsUpdate = useCallback((newStats: { entropy: number; aliveRatio: number; patternComplexity: number; spatialEntropy: number }) => {
    setStats(newStats);
  }, []);

  const handleInitialConfigSet = useCallback((newConfig: InitialConfigType) => {
    setInitialConfig(newConfig);
  }, []);

  const handleHover = useCallback((x: number, y: number | null) => {
    if (x >= 0 && y !== null && y >= 0) {
      setHoveredCell({ x, y });
    } else {
      setHoveredCell(null);
    }
  }, []);

  const handleInjectEntropy = useCallback(() => {
    injectEntropyFn();
  }, [injectEntropyFn]);

  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.leftPanel}>
          <ControlPanel
            gridSize={gridSize}
            setGridSize={setGridSize}
            speed={speed}
            setSpeed={setSpeed}
            onInjectEntropy={handleInjectEntropy}
          />
          <InitialConfigTool onConfigurationSet={handleInitialConfigSet} />
        </div>
        <div className={styles.centerPanel}>
          <div className={styles.canvasContainer}>
            <Canvas>
              <color attach="background" args={['#001a00']} />
              <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={40} />
              <GameOfLife
                gridSize={gridSize}
                speed={speed}
                onEntropyChange={handleEntropyChange}
                onCellsUpdate={handleCellsUpdate}
                onStatsUpdate={handleStatsUpdate}
                initialConfig={initialConfig}
                onHover={handleHover}
                onInjectEntropy={(fn: () => void) => setInjectEntropyFn(() => fn)}
              />
            </Canvas>
          </div>
          <div className={styles.graphContainer}>
            <EntropyGraph entropyHistory={entropyHistory} />
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.torusContainer}>
            <Canvas>
              <color attach="background" args={['#001a00']} />
              <PerspectiveCamera makeDefault position={[0, 0, 3]} />
              <TorusView cells={cells} gridSize={gridSize} hoveredCell={hoveredCell} />
            </Canvas>
          </div>
          <EntropyStats {...stats} />
        </div>
      </div>
    </main>
  );
}