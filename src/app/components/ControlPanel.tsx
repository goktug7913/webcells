import React from 'react';
import styles from '../styles/ControlPanel.module.css';

interface ControlPanelProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  onInjectEntropy: () => void;
  entropyStrength: number;
  setEntropyStrength: (value: number) => void;
  // Smooth Life parameters
  innerR: number;
  setInnerR: (value: number) => void;
  outerR: number;
  setOuterR: (value: number) => void;
  alpha_m: number;
  setAlpha_m: (value: number) => void;
  alpha_n: number;
  setAlpha_n: (value: number) => void;
  b1: number;
  setB1: (value: number) => void;
  b2: number;
  setB2: (value: number) => void;
  d1: number;
  setD1: (value: number) => void;
  d2: number;
  setD2: (value: number) => void;
  dt: number;
  setDt: (value: number) => void;
  autoReinit: boolean;
  setAutoReinit: (value: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  gridSize,
  setGridSize,
  isRunning,
  setIsRunning,
  onInjectEntropy,
  entropyStrength,
  setEntropyStrength,
  innerR,
  setInnerR,
  outerR,
  setOuterR,
  alpha_m,
  setAlpha_m,
  alpha_n,
  setAlpha_n,
  b1,
  setB1,
  b2,
  setB2,
  d1,
  setD1,
  d2,
  setD2,
  dt,
  setDt,
  autoReinit,
  setAutoReinit
}) => {
  return (
    <div className={styles.controlPanel}>
      <div className={styles.control}>
        <label>
          Grid Size: {gridSize}
          <input
            type="range"
            min="10"
            max="1024"
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
          />
        </label>
      </div>
      <div className={styles.controlRow}>
        <label>
          <input
            type="checkbox"
            checked={isRunning}
            onChange={(e) => setIsRunning(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          {isRunning ? 'Running' : 'Paused'}
        </label>
        <button className={styles.button} onClick={onInjectEntropy}>
          Inject Entropy
        </button>
      </div>
      <div className={styles.control}>
        <label>
          Entropy Strength: {entropyStrength.toFixed(2)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={entropyStrength}
            onChange={(e) => setEntropyStrength(Number(e.target.value))}
          />
        </label>
      </div>

      <div className={styles.control}>
        <label>
          <input
            type="checkbox"
            checked={autoReinit}
            onChange={(e) => setAutoReinit(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Auto Re-init on Parameter Change
        </label>
      </div>
      
      <div style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '12px' }}>
        <h3 style={{ marginBottom: '10px', fontSize: '15px' }}>Smooth Life Parameters</h3>

        <div className={styles.smoothLifeGrid}>
          <div className={styles.control}>
            <label>
              rᵢ: {innerR.toFixed(1)}
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.1"
                value={innerR}
                onChange={(e) => setInnerR(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              rₒ: {outerR.toFixed(1)}
              <input
                type="range"
                min="3.0"
                max="7.0"
                step="0.1"
                value={outerR}
                onChange={(e) => setOuterR(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              αₘ: {alpha_m.toFixed(3)}
              <input
                type="range"
                min="0.01"
                max="0.2"
                step="0.001"
                value={alpha_m}
                onChange={(e) => setAlpha_m(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              αₙ: {alpha_n.toFixed(3)}
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.001"
                value={alpha_n}
                onChange={(e) => setAlpha_n(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              β₁: {b1.toFixed(3)}
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.001"
                value={b1}
                onChange={(e) => setB1(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              β₂: {b2.toFixed(3)}
              <input
                type="range"
                min="0.2"
                max="0.5"
                step="0.001"
                value={b2}
                onChange={(e) => setB2(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              δ₁: {d1.toFixed(3)}
              <input
                type="range"
                min="0.2"
                max="0.5"
                step="0.001"
                value={d1}
                onChange={(e) => setD1(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              δ₂: {d2.toFixed(3)}
              <input
                type="range"
                min="0.4"
                max="0.7"
                step="0.001"
                value={d2}
                onChange={(e) => setD2(Number(e.target.value))}
              />
            </label>
          </div>

          <div className={styles.control}>
            <label>
              Δt: {dt.toFixed(3)}
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.001"
                value={dt}
                onChange={(e) => setDt(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;