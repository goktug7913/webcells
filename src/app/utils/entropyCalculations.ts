export function calculateSpatialEntropy(cells: boolean[], gridSize: number): number {
  const patterns = new Map<string, number>();
  const patternSize = 3;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
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

  const totalPatterns = gridSize * gridSize;
  let entropy = 0;
  for (const count of patterns.values()) {
    const p = count / totalPatterns;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

export function calculatePatternComplexity(cells: boolean[], gridSize: number): number {
  const patterns = new Set<string>();
  const patternSize = 3;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
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