import React from 'react';
import styles from '../styles/ControlPanel.module.css';

interface ControlPanelProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  speed: number;
  setSpeed: (speed: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  gridSize,
  setGridSize,
  speed,
  setSpeed,
}) => {
  return (
    <div className={styles.controlPanel}>
      <h2>Settings</h2>
      <div className={styles.control}>
        <label htmlFor="gridSize">Grid Size: {gridSize}</label>
        <input
          type="range"
          id="gridSize"
          min="10"
          max="200"
          step="10"
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="speed">Speed: {speed}</label>
        <input
          type="range"
          id="speed"
          min="1"
          max="60"
          step="1"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </div>
    </div>
  );
};

export default ControlPanel;