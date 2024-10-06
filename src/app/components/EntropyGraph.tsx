import React, { useRef, useEffect } from 'react';
import styles from '../styles/EntropyGraph.module.css';

interface EntropyGraphProps {
  entropyHistory: number[];
}

const EntropyGraph: React.FC<EntropyGraphProps> = ({ entropyHistory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw the graph
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = width / (entropyHistory.length - 1);
    entropyHistory.forEach((entropy, index) => {
      const x = index * step;
      const y = height - (entropy * height);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Add labels
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.fillText('Entropy', 5, 15);
    ctx.fillText('1.0', 5, 15);
    ctx.fillText('0.5', 5, height / 2 + 5);
    ctx.fillText('0.0', 5, height - 5);

  }, [entropyHistory]);

  return (
    <div className={styles.graphContainer}>
      <canvas ref={canvasRef} width={400} height={200} className={styles.graph} />
    </div>
  );
};

export default EntropyGraph;