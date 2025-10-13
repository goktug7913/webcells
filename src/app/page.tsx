'use client';
import { useState, useCallback } from 'react';
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Effects } from "@react-three/drei";
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import GameOfLife from "./components/GameOfLife";
import EntropyGraph from "./components/EntropyGraph";
import ControlPanel from "./components/ControlPanel";
import EntropyStats from "./components/EntropyStats";
import styles from './page.module.css';
import InitialConfigTool from './components/InitialConfigTool';
import { InitialConfigType } from './components/InitialConfigTool';

export default function Home() {
  const [entropyHistory, setEntropyHistory] = useState<number[]>([]);
  const [gridSize, setGridSize] = useState(256);
  const [isRunning, setIsRunning] = useState(true);
  const [cells, setCells] = useState<Float32Array>(new Float32Array(0));
  const [stats, setStats] = useState({ meanActivity: 0, activityVariance: 0, continuousEntropy: 0, spatialCorrelation: 0, patternComplexity: 0, spatialEntropy: 0 });
  const [initialConfig, setInitialConfig] = useState<InitialConfigType>(InitialConfigType.Random);
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
  const [entropyStrength, setEntropyStrength] = useState(1);

  const handleEntropyChange = useCallback((entropy: number) => {
    setEntropyHistory(prev => [...prev, entropy].slice(-100));
  }, []);

  const handleCellsUpdate = useCallback((newCells: Float32Array) => {
    setCells(newCells);
  }, []);

  const handleStatsUpdate = useCallback((newStats: { meanActivity: number; activityVariance: number; continuousEntropy: number; spatialCorrelation: number; patternComplexity: number; spatialEntropy: number }) => {
    setStats(newStats);
  }, []);

  const handleInitialConfigSet = useCallback((newConfig: InitialConfigType) => {
    setInitialConfig(newConfig);
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
            entropyStrength={entropyStrength}
            setEntropyStrength={setEntropyStrength}
          />
          <InitialConfigTool onConfigurationSet={handleInitialConfigSet} />
        </div>
        <div className={styles.centerPanel}>
          <div className={styles.canvasContainer}>
            <Canvas style={{ width: '100%', height: '100%' }}>
              <color attach="background" args={['#001a00']} />
              <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={40} />
              <GameOfLife
                gridSize={gridSize}
                isRunning={isRunning}
                onEntropyChange={handleEntropyChange}
                onCellsUpdate={handleCellsUpdate}
                onStatsUpdate={handleStatsUpdate}
                initialConfig={initialConfig}
                onHover={() => {}}
                onInjectEntropy={(fn: () => void) => setInjectEntropyFn(() => fn)}
                entropyStrength={entropyStrength}
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
              <Effects disableGamma>
                <primitive object={new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.05, 0.2)} />
              </Effects>
            </Canvas>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.graphContainer}>
            <EntropyGraph entropyHistory={entropyHistory} />
          </div>
          <EntropyStats {...stats} />
        </div>
      </div>
    </main>
  );
}