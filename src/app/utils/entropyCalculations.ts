// Improved entropy calculations for continuous Smooth Life data
export function calculateContinuousEntropy(values: Float32Array): number {
  // Calculate histogram-based entropy for continuous values
  const bins = 32;
  const histogram = new Array(bins).fill(0);

  for (let i = 0; i < values.length; i++) {
    const bin = Math.min(bins - 1, Math.floor(values[i] * bins));
    histogram[bin]++;
  }

  const total = values.length;
  let entropy = 0;

  for (const count of histogram) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy / Math.log2(bins); // Normalize to [0, 1]
}

export function calculateSpatialCorrelation(values: Float32Array, gridSize: number): number {
  // Calculate spatial autocorrelation at different scales
  let totalCorrelation = 0;
  let count = 0;

  // Sample at different distances
  for (let distance = 1; distance <= 3; distance++) {
    let correlation = 0;
    let samples = 0;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const center = values[y * gridSize + x];
        // Check correlation in 4 directions
        const directions = [
          [0, distance], [distance, 0], [0, -distance], [-distance, 0]
        ];

        for (const [dx, dy] of directions) {
          const nx = (x + dx + gridSize) % gridSize;
          const ny = (y + dy + gridSize) % gridSize;
          const neighbor = values[ny * gridSize + nx];

          correlation += center * neighbor;
          samples++;
        }
      }
    }

    if (samples > 0) {
      totalCorrelation += correlation / samples;
      count++;
    }
  }

  return count > 0 ? totalCorrelation / count : 0;
}

export function calculateActivityVariance(values: Float32Array): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance); // Return standard deviation
}

// Legacy functions for backward compatibility (converted to boolean internally)
export function calculateSpatialEntropy(values: Float32Array, gridSize: number): number {
  const bools = Array.from(values).map(v => v > 0.5);
  return calculateBooleanSpatialEntropy(bools, gridSize);
}

export function calculatePatternComplexity(values: Float32Array, gridSize: number): number {
  const bools = Array.from(values).map(v => v > 0.5);
  return calculateBooleanPatternComplexity(bools, gridSize);
}

function calculateBooleanSpatialEntropy(cells: boolean[], gridSize: number): number {
  const patterns = new Map<string, number>();
  const patternSize = 3;

  // Sample every 3rd cell to reduce autocorrelation
  for (let y = 0; y < gridSize; y += 3) {
    for (let x = 0; x < gridSize; x += 3) {
      let pattern = '';
      for (let dy = 0; dy < patternSize; dy++) {
        for (let dx = 0; dx < patternSize; dx++) {
          const nx = (x + dx) % gridSize;
          const ny = (y + dy) % gridSize;
          pattern += cells[ny * gridSize + nx] ? '1' : '0';
        }
      }
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
  }

  const totalPatterns = patterns.size;
  if (totalPatterns === 0) return 0;

  let entropy = 0;
  for (const count of patterns.values()) {
    const p = count / totalPatterns;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

function calculateBooleanPatternComplexity(cells: boolean[], gridSize: number): number {
  const patterns = new Set<string>();
  const patternSize = 3;

  // Sample every 3rd cell to reduce autocorrelation
  for (let y = 0; y < gridSize; y += 3) {
    for (let x = 0; x < gridSize; x += 3) {
      let pattern = '';
      for (let dy = 0; dy < patternSize; dy++) {
        for (let dx = 0; dx < patternSize; dx++) {
          const nx = (x + dx) % gridSize;
          const ny = (y + dy) % gridSize;
          pattern += cells[ny * gridSize + nx] ? '1' : '0';
        }
      }
      patterns.add(pattern);
    }
  }

  return patterns.size / (2 ** (patternSize * patternSize));
}