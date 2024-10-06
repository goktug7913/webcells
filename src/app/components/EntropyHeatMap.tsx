import React, { useRef, useEffect, useMemo } from 'react';
//import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface EntropyHeatMapProps {
    gridSize: number;
    localEntropy: number[];
    cellSize: number;
}

const EntropyHeatMap: React.FC<EntropyHeatMapProps> = ({ gridSize, localEntropy, cellSize }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    //const { viewport } = useThree();

    const geometry = useMemo(() => new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize, gridSize, gridSize), [gridSize, cellSize]);
    const material = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 }), []);

    useEffect(() => {
        if (meshRef.current && localEntropy.length === gridSize * gridSize) {
            const colors = new Float32Array(gridSize * gridSize * 3);

            for (let i = 0; i < localEntropy.length; i++) {
                const color = new THREE.Color();
                color.setHSL(0.33 * (1 - localEntropy[i]), 1, 0.5);
                color.toArray(colors, i * 3);
            }

            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            meshRef.current.geometry.attributes.color.needsUpdate = true;
        }
    }, [gridSize, localEntropy, geometry]);

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            position={[0, 0, -0.1]}
        />
    );
};

export default EntropyHeatMap;