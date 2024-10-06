import React from 'react';
import styles from '../page.module.css';

interface EntropyStatsProps {
  entropy: number;
  aliveRatio: number;
  patternComplexity: number;
  spatialEntropy: number;
}

const EntropyStats: React.FC<EntropyStatsProps> = ({ entropy, aliveRatio, patternComplexity, spatialEntropy }) => {
  return (
    <div className={styles.entropyStats}>
      <h2>Entropy Statistics</h2>
      <ul>
        <li>Global Entropy: {entropy.toFixed(4)}</li>
        <li>Alive Cell Ratio: {(aliveRatio * 100).toFixed(2)}%</li>
        <li>Pattern Complexity: {patternComplexity.toFixed(4)}</li>
        <li>Spatial Entropy: {spatialEntropy.toFixed(4)}</li>
      </ul>
    </div>
  );
};

export default EntropyStats;