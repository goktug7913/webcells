import React, { useState } from 'react';
import styles from '../styles/EntropyStats.module.css';

interface EntropyStatsProps {
  meanActivity: number;
  activityVariance: number;
  continuousEntropy: number;
  spatialCorrelation: number;
  patternComplexity: number;
  spatialEntropy: number;
}

const EntropyStats: React.FC<EntropyStatsProps> = ({
  meanActivity,
  activityVariance,
  continuousEntropy,
  spatialCorrelation,
  patternComplexity,
  spatialEntropy
}) => {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const helpText = {
    meanActivity: "Average activity level across all cells (0-1). Higher values indicate more active systems.",
    activityVariance: "Standard deviation of activity levels. Measures how much cells vary from the mean.",
    continuousEntropy: "Information entropy of the continuous value distribution. Higher = more diverse values.",
    spatialCorrelation: "How similar nearby cells are. Positive = clustered patterns, negative = checkerboard.",
    patternComplexity: "Fraction of possible 3×3 patterns observed. Higher = more complex local structures.",
    spatialEntropy: "Entropy of pattern distribution. Higher = more varied spatial arrangements."
  };

  const showTooltip = (metric: keyof typeof helpText) => setTooltip(helpText[metric]);
  const hideTooltip = () => setTooltip(null);

  return (
    <div className={styles.entropyStats}>
      <h2>System Metrics</h2>
      <ul>
        <li>
          Mean Activity: {meanActivity.toFixed(3)}
          <button
            className={styles.helpIcon}
            onMouseEnter={() => showTooltip('meanActivity')}
            onMouseLeave={hideTooltip}
            title="?"
          >
            ?
          </button>
        </li>
        <li>
          Activity Variance: {activityVariance.toFixed(3)}
          <button
            className={styles.helpIcon}
            onMouseEnter={() => showTooltip('activityVariance')}
            onMouseLeave={hideTooltip}
            title="?"
          >
            ?
          </button>
        </li>
        <li>
          Value Entropy: {continuousEntropy.toFixed(3)}
          <button
            className={styles.helpIcon}
            onMouseEnter={() => showTooltip('continuousEntropy')}
            onMouseLeave={hideTooltip}
            title="?"
          >
            ?
          </button>
        </li>
        <li>
          Spatial Correlation: {spatialCorrelation.toFixed(3)}
          <button
            className={styles.helpIcon}
            onMouseEnter={() => showTooltip('spatialCorrelation')}
            onMouseLeave={hideTooltip}
            title="?"
          >
            ?
          </button>
        </li>
        <li>
          Pattern Diversity: {patternComplexity.toFixed(3)}
          <button
            className={styles.helpIcon}
            onMouseEnter={() => showTooltip('patternComplexity')}
            onMouseLeave={hideTooltip}
            title="?"
          >
            ?
          </button>
        </li>
        <li>
          Pattern Entropy: {spatialEntropy.toFixed(3)}
          <button
            className={styles.helpIcon}
            onMouseEnter={() => showTooltip('spatialEntropy')}
            onMouseLeave={hideTooltip}
            title="?"
          >
            ?
          </button>
        </li>
      </ul>

      {tooltip && (
        <div className={styles.tooltip}>
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default EntropyStats;