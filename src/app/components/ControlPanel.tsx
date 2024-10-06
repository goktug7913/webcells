import React from 'react';
import styles from '../page.module.css';

interface ControlPanelProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  onInjectEntropy: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  gridSize,
  setGridSize,
  speed,
  setSpeed,
  onInjectEntropy
}) => {
  return (
    <div className={styles.controlPanel}>
      <label>
        Grid Size: {gridSize}
        <input
          type="range"
          min="10"
          max="500"
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
        />
      </label>
      <label>
        Speed: {speed.toFixed(1)}
        <input
          type="range"
          min="0.1"
          max="120"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </label>
      <button className={styles.button} onClick={onInjectEntropy}>
        Inject Entropy
      </button>
    </div>
  );
};

export default ControlPanel;