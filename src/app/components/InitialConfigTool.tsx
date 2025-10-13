import React from 'react';
import styles from '../styles/InitialConfigTool.module.css';
export enum InitialConfigType {
  Random = 'random',
  Glider = 'glider',
  Empty = 'empty'
}

interface InitialConfigToolProps {
  onConfigurationSet: (config: InitialConfigType) => void;
}

const InitialConfigTool: React.FC<InitialConfigToolProps> = ({ onConfigurationSet }) => {
  return (
    <div className={styles.controlPanel}>
      <h3 style={{ marginBottom: '15px' }}>Initial Configuration</h3>
      <button onClick={() => onConfigurationSet(InitialConfigType.Random)}>Random Noise</button>
      <button onClick={() => onConfigurationSet(InitialConfigType.Glider)}>Smooth Patterns</button>
      <button onClick={() => onConfigurationSet(InitialConfigType.Empty)}>Minimal Seed</button>
    </div>
  );
};

export default InitialConfigTool;