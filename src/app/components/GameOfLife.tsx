import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateSpatialEntropy, calculatePatternComplexity } from '../utils/entropyCalculations';
import { recognizePatterns } from '../utils/patternRecognition';
import EntropyHeatMap from './EntropyHeatMap';
import { Vector2 } from 'three';

interface GameOfLifeProps {
    gridSize: number;
    speed: number;
    onEntropyChange: (entropy: number) => void;
    onCellsUpdate: (cells: boolean[]) => void;
    onStatsUpdate: (stats: { entropy: number; aliveRatio: number; patternComplexity: number; spatialEntropy: number }) => void;
    initialConfig?: 'random' | 'glider' | 'empty';
    onHover: (x: number, y: number | null) => void;
}

const GameOfLife: React.FC<GameOfLifeProps> = ({ gridSize, speed, onEntropyChange, onCellsUpdate, onStatsUpdate, initialConfig = 'random', onHover }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [cells, setCells] = useState<boolean[]>([]);
    const lastUpdateTime = useRef(0);
    const [localEntropy, setLocalEntropy] = useState<number[]>([]);
    const { viewport } = useThree();
    const cellSize = Math.min(viewport.width, viewport.height) / gridSize;

    const createEmptyGrid = useCallback((): boolean[] => {
        return new Array(gridSize * gridSize).fill(false);
    }, [gridSize]);

    const initializeGrid = useCallback(() => {
        let newGrid: boolean[];
        switch (initialConfig) {
            case 'random':
                newGrid = Array.from({ length: gridSize * gridSize }, () => Math.random() > 0.5);
                break;
            case 'glider':
                newGrid = createEmptyGrid();
                const center = Math.floor(gridSize / 2);
                newGrid[center * gridSize + center] = true;
                newGrid[(center + 1) * gridSize + (center + 1)] = true;
                newGrid[(center + 1) * gridSize + (center + 2)] = true;
                newGrid[center * gridSize + (center + 2)] = true;
                newGrid[(center - 1) * gridSize + (center + 2)] = true;
                break;
            case 'empty':
            default:
                newGrid = createEmptyGrid();
                break;
        }
        return newGrid;
    }, [gridSize, initialConfig, createEmptyGrid]);

    useEffect(() => {
        setCells(initializeGrid());
    }, [initializeGrid]);

    const getNeighborCount = useCallback((x: number, y: number) => {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + gridSize) % gridSize;
                const ny = (y + dy + gridSize) % gridSize;
                if (cells[ny * gridSize + nx]) count++;
            }
        }
        return count;
    }, [cells, gridSize]);

    const calculateStats = useCallback(() => {
        const aliveCells = cells.filter(cell => cell).length;
        const aliveRatio = aliveCells / (gridSize * gridSize);
        const entropy = -aliveRatio * Math.log2(aliveRatio) - (1 - aliveRatio) * Math.log2(1 - aliveRatio);
        const patternComplexity = calculatePatternComplexity(cells, gridSize);
        const spatialEntropy = calculateSpatialEntropy(cells, gridSize);

        return { entropy, aliveRatio, patternComplexity, spatialEntropy };
    }, [cells, gridSize]);

    const calculateLocalEntropy = useCallback(() => {
        const localEntropyValues = new Array(gridSize * gridSize).fill(0);
        //const neighborhoodSize = 3; // 3x3 neighborhood

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                let aliveCells = 0;
                let totalCells = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = (x + dx + gridSize) % gridSize;
                        const ny = (y + dy + gridSize) % gridSize;
                        if (cells[ny * gridSize + nx]) aliveCells++;
                        totalCells++;
                    }
                }

                const aliveRatio = aliveCells / totalCells;
                const entropy = aliveRatio === 0 || aliveRatio === 1
                    ? 0
                    : -aliveRatio * Math.log2(aliveRatio) - (1 - aliveRatio) * Math.log2(1 - aliveRatio);

                localEntropyValues[y * gridSize + x] = entropy;
            }
        }

        return localEntropyValues;
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

    useFrame((_, delta) => {
        lastUpdateTime.current += delta;
        if (lastUpdateTime.current < 1 / speed) return;
        lastUpdateTime.current = 0;

        const newCells = [...cells];
        for (let i = 0; i < gridSize * gridSize; i++) {
            const x = i % gridSize;
            const y = Math.floor(i / gridSize);
            const neighbors = getNeighborCount(x, y);

            if (cells[i]) {
                newCells[i] = neighbors === 2 || neighbors === 3;
            } else {
                newCells[i] = neighbors === 3;
            }
        }

        setCells(newCells);
        onCellsUpdate(newCells);

        const stats = calculateStats();
        onStatsUpdate(stats);
        onEntropyChange(stats.entropy);

        const newLocalEntropy = calculateLocalEntropy();
        setLocalEntropy(newLocalEntropy);

        const patterns = recognizePatterns(newCells, gridSize);
        console.log('Recognized patterns:', patterns);

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
            tempObject.scale.set(cells[i] ? 1 : 0, cells[i] ? 1 : 0, 1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
            tempColor.setHSL(cells[i] ? 0.3 : 0, 1, 0.5);
            meshRef.current.setColorAt(i, tempColor);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [gridSize, cellSize, cells]);

    useEffect(() => {
        if (cells.every(cell => !cell)) {
            setCells(initializeGrid());
        }
    }, [cells, initializeGrid]);

    return (
        <>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, gridSize * gridSize]}
                onPointerMove={handlePointerMove}
            >
                <planeGeometry args={[cellSize, cellSize]} />
                <meshBasicMaterial />
            </instancedMesh>
            <EntropyHeatMap gridSize={gridSize} localEntropy={localEntropy} cellSize={cellSize} />
        </>
    );
};

export default GameOfLife;