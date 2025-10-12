import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateSpatialEntropy, calculatePatternComplexity } from '../utils/entropyCalculations';
import { GPUComputationRenderer } from '../utils/gpuCompute';
import { InitialConfigType } from './InitialConfigTool';

interface GameOfLifeProps {
    gridSize: number;
    isRunning: boolean;
    onEntropyChange: (entropy: number) => void;
    onCellsUpdate: (cells: Float32Array) => void;
    onStatsUpdate: (stats: { entropy: number; aliveRatio: number; patternComplexity: number; spatialEntropy: number }) => void;
    initialConfig?: InitialConfigType;
    onHover: (x: number, y: number | null) => void;
    onInjectEntropy: (fn: () => void) => void;
    entropyStrength: number;
    // Smooth Life parameters
    innerR: number;
    outerR: number;
    alpha_m: number;
    alpha_n: number;
    b1: number;
    b2: number;
    d1: number;
    d2: number;
    dt: number;
    autoReinit: boolean;
}

import fragmentShader from '../shaders/automaton.frag.glsl';

type ComputeVariable = ReturnType<GPUComputationRenderer['addVariable']>;

const GameOfLife: React.FC<GameOfLifeProps> = ({
    gridSize,
    isRunning,
    onEntropyChange,
    onCellsUpdate,
    onStatsUpdate,
    initialConfig = InitialConfigType.Random,
    onHover,
    onInjectEntropy,
    entropyStrength,
    innerR,
    outerR,
    alpha_m,
    alpha_n,
    b1,
    b2,
    d1,
    d2,
    dt,
    autoReinit
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const gpuComputeRef = useRef<GPUComputationRenderer | null>(null);
    const computeVarRef = useRef<ComputeVariable | null>(null);
    const gpuPixelBuffer = useRef<Float32Array | null>(null);
    const [cells, setCells] = useState<Float32Array>(new Float32Array(gridSize * gridSize));
    const lastReadbackTime = useRef(0);
    const { viewport, gl } = useThree();
    const cellSize = Math.min(viewport.width, viewport.height) / gridSize;

    const initializeGrid = useCallback(() => {
        const newGrid = new Float32Array(gridSize * gridSize);
        if (initialConfig === 'random') {
            for (let i = 0; i < newGrid.length; i++) {
                newGrid[i] = Math.random();
            }
        } else if (initialConfig === 'glider') {
            // Initialize smooth circular patterns suitable for Smooth Life
            const center = Math.floor(gridSize / 2);
            
            // Create a smooth circular blob
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    const dx = x - center;
                    const dy = y - center;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 8) {
                        // Smooth falloff from center
                        newGrid[y * gridSize + x] = Math.max(0, 1 - dist / 8);
                    } else if (dist < 15) {
                        // Add some noise in the outer ring for complexity
                        newGrid[y * gridSize + x] = Math.random() * 0.3;
                    }
                }
            }
            
            // Add a few smaller circular patterns
            const patterns = [
                { x: center - 20, y: center - 20, radius: 5 },
                { x: center + 20, y: center + 20, radius: 4 },
                { x: center - 15, y: center + 15, radius: 3 }
            ];
            
            patterns.forEach(pattern => {
                for (let y = 0; y < gridSize; y++) {
                    for (let x = 0; x < gridSize; x++) {
                        const dx = x - pattern.x;
                        const dy = y - pattern.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < pattern.radius) {
                            const idx = y * gridSize + x;
                            newGrid[idx] = Math.max(newGrid[idx], Math.max(0, 1 - dist / pattern.radius));
                        }
                    }
                }
            });
        } else if (initialConfig === 'empty') {
            // Initialize with mostly empty grid, but add a few small patterns
            for (let i = 0; i < newGrid.length; i++) {
                newGrid[i] = Math.random() < 0.01 ? Math.random() * 0.5 : 0;
            }
            
            // Add a small circular pattern in the center
            const center = Math.floor(gridSize / 2);
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    const dx = x - center;
                    const dy = y - center;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 3) {
                        newGrid[y * gridSize + x] = Math.max(0, 1 - dist / 3);
                    }
                }
            }
        }
        return newGrid;
    }, [gridSize, initialConfig]);

    const calculateStats = useCallback((cellsData: Float32Array) => {
        const aliveCells = cellsData.reduce((sum, cell) => sum + cell, 0);
        const aliveRatio = aliveCells / (gridSize * gridSize);
        const entropy = (aliveRatio === 0 || aliveRatio === 1)
            ? 0
            : -aliveRatio * Math.log2(aliveRatio) - (1 - aliveRatio) * Math.log2(1 - aliveRatio);
        const patternComplexity = calculatePatternComplexity(Array.from(cellsData).map(Boolean), gridSize);
        const spatialEntropy = calculateSpatialEntropy(Array.from(cellsData).map(Boolean), gridSize);

        return { entropy, aliveRatio, patternComplexity, spatialEntropy };
    }, [gridSize]);

    const { raycaster, camera } = useThree();
    const mouse = useRef(new THREE.Vector2());

    const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
        // Type assertion for event
        const mouseEvent = event as unknown as MouseEvent;
        const canvas = gl.domElement;
        const { left, top, width, height } = canvas.getBoundingClientRect();
        const { clientX, clientY } = mouseEvent;
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
    }, [raycaster, camera, gridSize, onHover, gl]);

    // Define updateMesh early so hooks below can reference it
    const updateMesh = useCallback(
        (cellsData: Float32Array) => {
            if (!meshRef.current) return;
            const tempColor = new THREE.Color();
            for (let i = 0; i < gridSize * gridSize; i++) {
                tempColor.setHSL(0.3, 1, cellsData[i] * 0.5);  // Adjust color based on cell state
                meshRef.current.setColorAt(i, tempColor);
            }
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        },
        [gridSize]
    );

    const rebuildGPU = useCallback((initGrid: Float32Array) => {
        if (!gl) return;

        if (gpuComputeRef.current) {
            try {
                gpuComputeRef.current.dispose();
            } catch (e) {
                // ignore
            }
        }

        const gpuCompute = new GPUComputationRenderer(gridSize, gridSize, gl);

        const initTexture = gpuCompute.createTexture();
        const data = initTexture.image.data as Float32Array;
        for (let i = 0; i < gridSize * gridSize; i++) {
            const v = initGrid[i];
            const idx = i * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = v;
            data[idx + 3] = 1;
        }

        const variable = gpuCompute.addVariable('textureState', fragmentShader, initTexture);
        gpuCompute.setVariableDependencies(variable, [variable]);

        Object.assign(variable.material.uniforms, {
            gridSize: { value: gridSize },
            innerR: { value: innerR },
            outerR: { value: outerR },
            alpha_m: { value: alpha_m },
            alpha_n: { value: alpha_n },
            b1: { value: b1 },
            b2: { value: b2 },
            d1: { value: d1 },
            d2: { value: d2 },
            dt: { value: dt }
        });

        const err = gpuCompute.init();
        if (err) {
            console.error('GPUComputationRenderer init error', err);
        }

        gpuComputeRef.current = gpuCompute;
        computeVarRef.current = variable;
        gpuPixelBuffer.current = new Float32Array(gridSize * gridSize * 4);

        setCells(initGrid);
    }, [gl, gridSize]);

    const injectEntropy = useCallback(() => {
        if (!gpuComputeRef.current || !computeVarRef.current) return;
        const renderTarget = gpuComputeRef.current.getCurrentRenderTarget(computeVarRef.current);
        if (!gpuPixelBuffer.current) return;

        gl.readRenderTargetPixels(renderTarget, 0, 0, gridSize, gridSize, gpuPixelBuffer.current);
        const currentCells = new Float32Array(gridSize * gridSize);
        for (let i = 0; i < gridSize * gridSize; i++) {
            currentCells[i] = gpuPixelBuffer.current[i * 4];
        }

        // Flip a fraction of random cells based on entropyStrength (0..1)
        const baseFraction = 1 / 20; // 5%
        const fraction = Math.max(0, Math.min(1, entropyStrength)) * baseFraction;
        const flips = Math.max(1, Math.floor((gridSize * gridSize) * fraction));
        for (let k = 0; k < flips; k++) {
            const index = Math.floor(Math.random() * gridSize * gridSize);
            currentCells[index] = 1 - currentCells[index];
        }

        rebuildGPU(currentCells);
        updateMesh(currentCells);
    }, [gridSize, gl, rebuildGPU, updateMesh, entropyStrength]);

    useEffect(() => {
        onInjectEntropy(injectEntropy);
    }, [onInjectEntropy, injectEntropy]);

    useEffect(() => {
        // Initialize GPU compute when WebGL context is ready
        if (!gl) return;
        const initGrid = initializeGrid();
        rebuildGPU(initGrid);

        // cleanup on unmount or grid size change (rebuildGPU already disposes prior instance)
        return () => {
            if (gpuComputeRef.current) {
                try {
                    gpuComputeRef.current.dispose();
                } catch (e) {
                    // ignore
                }
                gpuComputeRef.current = null;
                computeVarRef.current = null;
                gpuPixelBuffer.current = null;
            }
        };
    }, [gl, gridSize, initializeGrid, rebuildGPU]);

    // Update uniforms when parameters change
    useEffect(() => {
        if (!computeVarRef.current || !computeVarRef.current.material) return;
        const mat = computeVarRef.current.material as THREE.ShaderMaterial;
        if (mat && mat.uniforms) {
            mat.uniforms.innerR.value = innerR;
            mat.uniforms.outerR.value = outerR;
            mat.uniforms.alpha_m.value = alpha_m;
            mat.uniforms.alpha_n.value = alpha_n;
            mat.uniforms.b1.value = b1;
            mat.uniforms.b2.value = b2;
            mat.uniforms.d1.value = d1;
            mat.uniforms.d2.value = d2;
            mat.uniforms.dt.value = dt;
        }
    }, [innerR, outerR, alpha_m, alpha_n, b1, b2, d1, d2, dt]);

    // Auto re-initialize when parameters change (if enabled)
    useEffect(() => {
        if (!autoReinit) return;
        const initGrid = initializeGrid();
        rebuildGPU(initGrid);
    }, [autoReinit, innerR, outerR, alpha_m, alpha_n, b1, b2, d1, d2, dt, gridSize, initializeGrid, rebuildGPU]);

    // Precompute static instance transforms once (positions), only update colors later
    useEffect(() => {
        if (!meshRef.current) return;
        const tempObject = new THREE.Object3D();
        for (let i = 0; i < gridSize * gridSize; i++) {
            const x = (i % gridSize) * cellSize - (gridSize * cellSize) / 2;
            const y = Math.floor(i / gridSize) * cellSize - (gridSize * cellSize) / 2;
            tempObject.position.set(x, y, 0);
            tempObject.scale.set(1, 1, 1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [gridSize, cellSize]);

    useFrame((_, delta) => {
        if (!gpuComputeRef.current || !computeVarRef.current || !gpuPixelBuffer.current) return;

        // If not running, pause updates
        if (!isRunning) return;

        // update dt uniform (no speed multiplier needed since dt controls the integration step)
        const mat = computeVarRef.current.material as THREE.ShaderMaterial;
        if (mat && mat.uniforms && mat.uniforms.dt) {
            mat.uniforms.dt.value = dt;
        }

        gpuComputeRef.current.compute();

        // Fixed readback frequency (can be adjusted if needed)
        const targetHz = 30; // 30Hz for smooth updates
        const interval = 1 / targetHz;
        lastReadbackTime.current += delta;
        if (lastReadbackTime.current < interval) {
            return;
        }
        lastReadbackTime.current = 0;

        const renderTarget = gpuComputeRef.current.getCurrentRenderTarget(computeVarRef.current);
        gl.readRenderTargetPixels(renderTarget, 0, 0, gridSize, gridSize, gpuPixelBuffer.current);

        const cpuCells = new Float32Array(gridSize * gridSize);
        for (let i = 0; i < gridSize * gridSize; i++) {
            cpuCells[i] = gpuPixelBuffer.current[i * 4];
        }

        setCells(cpuCells);
        onCellsUpdate(cpuCells);

        const stats = calculateStats(cpuCells);
        onStatsUpdate(stats);
        onEntropyChange(stats.entropy);

        updateMesh(cpuCells);
    });

    

    useEffect(() => {
        if (cells.every(cell => cell === 0)) {
            setCells(initializeGrid());
        }
    }, [cells, initializeGrid]);

    return (
        <instancedMesh
            key={gridSize}
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