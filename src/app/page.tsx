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
  const [gridSize, setGridSize] = useState(128);
  const [isRunning, setIsRunning] = useState(true);
  const [cells, setCells] = useState<Float32Array>(new Float32Array(0));
  const [stats, setStats] = useState({ entropy: 0, aliveRatio: 0, patternComplexity: 0, spatialEntropy: 0 });
  const [initialConfig, setInitialConfig] = useState<InitialConfigType>(InitialConfigType.Random);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [injectEntropyFn, setInjectEntropyFn] = useState<() => void>(() => {});
  
  // Smooth Life parameters
  const [innerR, setInnerR] = useState(1.0);
  const [outerR, setOuterR] = useState(3.2);
  const [alpha_m, setAlpha_m] = useState(0.028);
  const [alpha_n, setAlpha_n] = useState(0.147);
  const [b1, setB1] = useState(0.22);
  const [b2, setB2] = useState(0.305);
  const [d1, setD1] = useState(0.2);
  const [d2, setD2] = useState(0.4);
  const [dt, setDt] = useState(0.1);
  const [autoReinit, setAutoReinit] = useState(false);

  const handleEntropyChange = useCallback((entropy: number) => {
    setEntropyHistory(prev => [...prev, entropy].slice(-100));
  }, []);

  const handleCellsUpdate = useCallback((newCells: Float32Array) => {
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
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            onInjectEntropy={handleInjectEntropy}
            innerR={innerR}
            setInnerR={setInnerR}
            outerR={outerR}
            setOuterR={setOuterR}
            alpha_m={alpha_m}
            setAlpha_m={setAlpha_m}
            alpha_n={alpha_n}
            setAlpha_n={setAlpha_n}
            b1={b1}
            setB1={setB1}
            b2={b2}
            setB2={setB2}
            d1={d1}
            setD1={setD1}
            d2={d2}
            setD2={setD2}
            dt={dt}
            setDt={setDt}
            autoReinit={autoReinit}
            setAutoReinit={setAutoReinit}
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
                isRunning={isRunning}
                onEntropyChange={handleEntropyChange}
                onCellsUpdate={handleCellsUpdate}
                onStatsUpdate={handleStatsUpdate}
                initialConfig={initialConfig}
                onHover={handleHover}
                onInjectEntropy={(fn: () => void) => setInjectEntropyFn(() => fn)}
                innerR={innerR}
                outerR={outerR}
                alpha_m={alpha_m}
                alpha_n={alpha_n}
                b1={b1}
                b2={b2}
                d1={d1}
                d2={d2}
                dt={dt}
                autoReinit={autoReinit}
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