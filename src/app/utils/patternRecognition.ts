const patterns = {
  glider: [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1]
  ],
  blinker: [
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0]
  ],
  // Add more patterns as needed
};

export function recognizePatterns(cells: boolean[], gridSize: number): { [key: string]: number } {
  const patternCounts: { [key: string]: number } = {};

  for (const [patternName, pattern] of Object.entries(patterns)) {
    patternCounts[patternName] = 0;
    for (let y = 0; y < gridSize - pattern.length + 1; y++) {
      for (let x = 0; x < gridSize - pattern[0].length + 1; x++) {
        if (matchPattern(cells, gridSize, x, y, pattern)) {
          patternCounts[patternName]++;
        }
      }
    }
  }

  return patternCounts;
}

function matchPattern(cells: boolean[], gridSize: number, startX: number, startY: number, pattern: number[][]): boolean {
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      const cellIndex = (startY + y) * gridSize + (startX + x);
      if ((cells[cellIndex] ? 1 : 0) !== pattern[y][x]) {
        return false;
      }
    }
  }
  return true;
}