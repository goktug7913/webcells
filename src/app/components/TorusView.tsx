import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface TorusViewProps {
  cells: number[];
  gridSize: number;
  hoveredCell: { x: number; y: number } | null;
}

const TorusView: React.FC<TorusViewProps> = ({ cells, gridSize, hoveredCell }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < cells.length; i++) {
      const x = (i % gridSize) / gridSize;
      const y = Math.floor(i / gridSize) / gridSize;

      dummy.position.set(
        (1 + 0.3 * Math.cos(x * Math.PI * 2)) * Math.cos(y * Math.PI * 2),
        (1 + 0.3 * Math.cos(x * Math.PI * 2)) * Math.sin(y * Math.PI * 2),
        0.3 * Math.sin(x * Math.PI * 2)
      );

      dummy.scale.setScalar(cells[i] ? 0.015 : 0.005);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      color.setHSL(cells[i] ? 0.3 : 0, 1, 0.5);
      meshRef.current.setColorAt(i, color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // Update highlight position
    if (highlightRef.current && hoveredCell) {
      const { x, y } = hoveredCell;
      const xPos = x / gridSize;
      const yPos = y / gridSize;

      highlightRef.current.position.set(
        (1 + 0.3 * Math.cos(xPos * Math.PI * 2)) * Math.cos(yPos * Math.PI * 2),
        (1 + 0.3 * Math.cos(xPos * Math.PI * 2)) * Math.sin(yPos * Math.PI * 2),
        0.3 * Math.sin(xPos * Math.PI * 2)
      );
      highlightRef.current.visible = true;
    } else if (highlightRef.current) {
      highlightRef.current.visible = false;
    }
  });

  return (
    <>
      <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      <instancedMesh ref={meshRef} args={[undefined, undefined, cells.length]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial />
      </instancedMesh>
      <mesh ref={highlightRef}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  );
};

export default TorusView;