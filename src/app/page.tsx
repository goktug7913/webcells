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

// Remove the unused GameOfLifeProps interface

export default function Home() {
  const [entropyHistory, setEntropyHistory] = useState<number[]>([]);
  const [gridSize, setGridSize] = useState(50);
  const [speed, setSpeed] = useState(10);
  const [cells, setCells] = useState<boolean[]>([]);
  const [stats, setStats] = useState({ entropy: 0, aliveRatio: 0, patternComplexity: 0, spatialEntropy: 0 });
  const [initialConfig, setInitialConfig] = useState<'random' | 'glider' | 'empty'>('random');
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const handleEntropyChange = useCallback((entropy: number) => {
    setEntropyHistory(prev => [...prev, entropy].slice(-100));
  }, []);

  const handleCellsUpdate = useCallback((newCells: boolean[]) => {
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

  return (
    <main className={styles.main}>
      <div className="container">
        <h1 className="title">Conway&apos;s Game of Life: Toroidal Edition</h1>
        <div className={styles.content}>
          <div className={styles.leftPanel}>
            <div className="panel">
              <ControlPanel
                gridSize={gridSize}
                setGridSize={setGridSize}
                speed={speed}
                setSpeed={setSpeed}
              />
            </div>
            <div className="panel">
              <EntropyStats {...stats} />
            </div>
            <div className="panel">
              <InitialConfigTool onConfigurationSet={handleInitialConfigSet} />
            </div>
          </div>
          <div className={styles.centerPanel}>
            <div className={styles.canvasContainer}>
              <Canvas>
                <color attach="background" args={['#000000']} />
                <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={40} />
                <GameOfLife
                  gridSize={gridSize}
                  speed={speed}
                  onEntropyChange={handleEntropyChange}
                  onCellsUpdate={handleCellsUpdate}
                  onStatsUpdate={handleStatsUpdate}
                  initialConfig={initialConfig}
                  onHover={handleHover}
                />
              </Canvas>
            </div>
            <EntropyGraph entropyHistory={entropyHistory} />
          </div>
          <div className={styles.rightPanel}>
            <div className={styles.torusContainer}>
              <Canvas>
                <color attach="background" args={['#000000']} />
                <PerspectiveCamera makeDefault position={[0, 0, 3]} />
                <TorusView cells={cells} gridSize={gridSize} hoveredCell={hoveredCell} />
              </Canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
