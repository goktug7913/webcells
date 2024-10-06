import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateSpatialEntropy, calculatePatternComplexity } from '../utils/entropyCalculations';
import { Vector2 } from 'three';

interface GameOfLifeProps {
    gridSize: number;
    speed: number;
    onEntropyChange: (entropy: number) => void;
    onCellsUpdate: (cells: number[]) => void;  // Changed from boolean[] to number[]
    onStatsUpdate: (stats: { entropy: number; aliveRatio: number; patternComplexity: number; spatialEntropy: number }) => void;
    initialConfig?: 'random' | 'glider' | 'empty';
    onHover: (x: number, y: number | null) => void;
    onInjectEntropy: (fn: () => void) => void;
}

const GameOfLife: React.FC<GameOfLifeProps> = ({ 
    gridSize, 
    speed, 
    onEntropyChange, 
    onCellsUpdate, 
    onStatsUpdate, 
    initialConfig = 'random', 
    onHover, 
    onInjectEntropy
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [cells, setCells] = useState<Float32Array>(new Float32Array(gridSize * gridSize));
    const lastUpdateTime = useRef(0);
    const { viewport } = useThree();
    const cellSize = Math.min(viewport.width, viewport.height) / gridSize;

    const initializeGrid = useCallback(() => {
        const newGrid = new Float32Array(gridSize * gridSize);
        if (initialConfig === 'random') {
            for (let i = 0; i < newGrid.length; i++) {
                newGrid[i] = Math.random();
            }
        } else if (initialConfig === 'glider') {
            // Initialize a glider pattern
            const center = Math.floor(gridSize / 2);
            newGrid[center * gridSize + center] = 1;
            newGrid[(center + 1) * gridSize + (center + 1)] = 1;
            newGrid[(center + 1) * gridSize + (center + 2)] = 1;
            newGrid[center * gridSize + (center + 2)] = 1;
            newGrid[(center - 1) * gridSize + (center + 2)] = 1;
        }
        return newGrid;
    }, [gridSize, initialConfig]);

    useEffect(() => {
        setCells(initializeGrid());
    }, [initializeGrid]);

    const getNeighborhood = useCallback((x: number, y: number, innerRadius: number, outerRadius: number) => {
        let innerSum = 0;
        let outerSum = 0;
        let innerCount = 0;
        let outerCount = 0;

        for (let dy = -outerRadius; dy <= outerRadius; dy++) {
            for (let dx = -outerRadius; dx <= outerRadius; dx++) {
                const distance = Math.sqrt(dx*dx + dy*dy);
                if (distance <= outerRadius) {
                    const nx = (x + dx + gridSize) % gridSize;
                    const ny = (y + dy + gridSize) % gridSize;
                    const value = cells[ny * gridSize + nx];
                    
                    if (distance <= innerRadius) {
                        innerSum += value;
                        innerCount++;
                    } else {
                        outerSum += value;
                        outerCount++;
                    }
                }
            }
        }

        return {
            innerAvg: innerSum / innerCount,
            outerAvg: outerSum / outerCount
        };
    }, [cells, gridSize]);

    const updateCells = useMemo(() => {
        return () => {
            const newCells = new Float32Array(gridSize * gridSize);
            const innerRadius = 3;
            const outerRadius = 5;
            const birthLow = 0.278;
            const birthHigh = 0.365;
            const deathLow = 0.267;
            const deathHigh = 0.445;

            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    const i = y * gridSize + x;
                    const { innerAvg, outerAvg } = getNeighborhood(x, y, innerRadius, outerRadius);
                    const s = outerAvg;
                    // Removed unused 'm' variable
                    let n = 0;

                    if (cells[i] > 0.5) {
                        n = (s >= deathLow && s <= deathHigh) ? 1 : 0;
                    } else {
                        n = (s >= birthLow && s <= birthHigh) ? 1 : 0;
                    }

                    newCells[i] = cells[i] + 0.5 * (n - cells[i]);
                }
            }
            return newCells;
        };
    }, [cells, gridSize, getNeighborhood]);

    const calculateStats = useCallback(() => {
        const aliveCells = cells.reduce((sum, cell) => sum + cell, 0);
        const aliveRatio = aliveCells / (gridSize * gridSize);
        const entropy = -aliveRatio * Math.log2(aliveRatio) - (1 - aliveRatio) * Math.log2(1 - aliveRatio);
        const patternComplexity = calculatePatternComplexity(Array.from(cells).map(Boolean), gridSize);
        const spatialEntropy = calculateSpatialEntropy(Array.from(cells).map(Boolean), gridSize);

        return { entropy, aliveRatio, patternComplexity, spatialEntropy };
    }, [cells, gridSize]);

    const { raycaster, camera } = useThree();
    const mouse = useRef(new Vector2());

    const handlePointerMove = useCallback((event: THREE.Event) => {
        // Type assertion for event
        const mouseEvent = event as unknown as MouseEvent;
        const target = event.target as HTMLElement;
        const { clientX, clientY } = mouseEvent;
        const { left, top, width, height } = target.getBoundingClientRect();
        mouse.current.x = ((clientX - left) / width) * 2 - 1;
        mouse.current.y = -((clientY - top) / height) * 2 + 1;
        raycaster.setFromCamera(mouse.current, camera);
        const intersects = raycaster.intersectObject(meshRef.current!);
        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
            const index = intersects[0].instanceId;
            const x = index % gridSize;
            const y = Math.floor(index / gridSize);
            onHover(x, y);
        } else {
            onHover(-1, -1);
        }
    }, [raycaster, camera, gridSize, onHover]);

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        canvas?.addEventListener('pointermove', handlePointerMove);
        return () => {
            canvas?.removeEventListener('pointermove', handlePointerMove);
        };
    }, [handlePointerMove]);

    const injectEntropy = useCallback(() => {
        setCells(prevCells => {
            const newCells = new Float32Array(prevCells);
            for (let i = 0; i < gridSize * gridSize / 10; i++) {
                const index = Math.floor(Math.random() * gridSize * gridSize);
                newCells[index] = 1 - newCells[index];
            }
            return newCells;
        });
    }, [gridSize]);

    useEffect(() => {
        onInjectEntropy(injectEntropy);
    }, [onInjectEntropy, injectEntropy]);

    useFrame((_, delta) => {
        lastUpdateTime.current += delta;
        if (lastUpdateTime.current < 1 / speed) return;
        lastUpdateTime.current = 0;

        const newCells = updateCells();
        setCells(newCells);
        onCellsUpdate(Array.from(newCells));

        // Update stats and entropy (you may need to adjust these calculations for continuous states)
        const stats = calculateStats();
        onStatsUpdate(stats);
        onEntropyChange(stats.entropy);

        updateMesh();
    });

    const updateMesh = useCallback(() => {
        if (!meshRef.current) return;

        const tempObject = new THREE.Object3D();
        const tempColor = new THREE.Color();
        for (let i = 0; i < gridSize * gridSize; i++) {
            const x = (i % gridSize) * cellSize - (gridSize * cellSize) / 2;
            const y = Math.floor(i / gridSize) * cellSize - (gridSize * cellSize) / 2;
            tempObject.position.set(x, y, 0);
            tempObject.scale.set(1, 1, 1);  // Always show all cells
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
            tempColor.setHSL(0.3, 1, cells[i] * 0.5);  // Adjust color based on cell state
            meshRef.current.setColorAt(i, tempColor);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [gridSize, cellSize, cells]);

    useEffect(() => {
        if (cells.every(cell => cell === 0)) {
            setCells(initializeGrid());
        }
    }, [cells, initializeGrid]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, gridSize * gridSize]}
            onPointerMove={handlePointerMove}
        >
            <planeGeometry args={[cellSize, cellSize]} />
            <meshBasicMaterial />
        </instancedMesh>
    );
};

export default GameOfLife;