import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateContinuousEntropy, calculateSpatialCorrelation, calculateActivityVariance, calculateSpatialEntropy, calculatePatternComplexity } from '../utils/entropyCalculations';
import { GPUComputationRenderer } from '../utils/gpuCompute';
import { InitialConfigType } from './InitialConfigTool';

interface GameOfLifeProps {
    gridSize: number;
    isRunning: boolean;
    onEntropyChange: (entropy: number) => void;
    onCellsUpdate: (cells: Float32Array) => void;
    onStatsUpdate: (stats: { meanActivity: number; activityVariance: number; continuousEntropy: number; spatialCorrelation: number; patternComplexity: number; spatialEntropy: number }) => void;
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
import displayVert from '../shaders/display.vert.glsl';
import displayFrag from '../shaders/display.frag.glsl';

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
    const meshRef = useRef<THREE.Mesh>(null);
    const gpuComputeRef = useRef<GPUComputationRenderer | null>(null);
    const computeVarRef = useRef<ComputeVariable | null>(null);
    const gpuPixelBuffer = useRef<Float32Array | null>(null);
    const displayMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
    const [cells, setCells] = useState<Float32Array>(new Float32Array(gridSize * gridSize));
    const lastReadbackTime = useRef(0);
    const { viewport, gl } = useThree();

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

    const calculateStats = useCallback((cellsData: Float32Array, size: number) => {
        // Mean activity level (continuous)
        const meanActivity = cellsData.reduce((sum, val) => sum + val, 0) / cellsData.length;

        // Activity variance (standard deviation)
        const activityVariance = calculateActivityVariance(cellsData);

        // Continuous entropy (information content of value distribution)
        const continuousEntropy = calculateContinuousEntropy(cellsData);

        // Spatial correlation (how similar nearby cells are)
        const spatialCorrelation = calculateSpatialCorrelation(cellsData, size);

        // Legacy metrics for comparison
        const bools = Array.from(cellsData).map(v => v > 0.5);
        const patternComplexity = calculatePatternComplexity(cellsData, size);
        const spatialEntropy = calculateSpatialEntropy(cellsData, size);

        return {
            meanActivity,
            activityVariance,
            continuousEntropy,
            spatialCorrelation,
            patternComplexity,
            spatialEntropy
        };
    }, []);

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
        if (intersects.length > 0 && intersects[0].uv) {
            const uv = intersects[0].uv;
            const x = Math.min(gridSize - 1, Math.max(0, Math.floor(uv.x * gridSize)));
            const y = Math.min(gridSize - 1, Math.max(0, Math.floor((1 - uv.y) * gridSize)));
            onHover(x, y);
        } else {
            onHover(-1, -1);
        }
    }, [raycaster, camera, gridSize, onHover, gl]);

    // Helper to update displayed texture after compute
    const updateDisplayTexture = useCallback(() => {
        if (!gpuComputeRef.current || !computeVarRef.current || !displayMaterialRef.current) return;
        const rt = gpuComputeRef.current.getCurrentRenderTarget(computeVarRef.current);
        const texture = rt.texture as THREE.Texture;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        if (displayMaterialRef.current.uniforms && displayMaterialRef.current.uniforms.uTexture) {
            displayMaterialRef.current.uniforms.uTexture.value = texture;
        }
    }, []);

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
        updateDisplayTexture();
    }, [gridSize, gl, rebuildGPU, updateDisplayTexture, entropyStrength]);

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

    // Keep display plane sized to viewport
    useEffect(() => {
        // nothing needed here; the plane uses viewport sizes directly
    }, [viewport.width, viewport.height]);

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
        updateDisplayTexture();

        // Throttled CPU readback for stats only
        const targetHz = gridSize <= 128 ? 20 : gridSize <= 256 ? 8 : 1;
        const interval = 1 / targetHz;
        lastReadbackTime.current += delta;
        if (lastReadbackTime.current < interval) {
            return;
        }
        lastReadbackTime.current = 0;

        const renderTarget = gpuComputeRef.current.getCurrentRenderTarget(computeVarRef.current);
        gl.readRenderTargetPixels(renderTarget, 0, 0, gridSize, gridSize, gpuPixelBuffer.current);

        // Downsample for stats to at most 128x128 to keep CPU work bounded
        const sampleSize = Math.min(gridSize, 128);
        const stride = Math.max(1, Math.floor(gridSize / sampleSize));
        const sampled = new Float32Array(sampleSize * sampleSize);
        let si = 0;
        for (let y = 0; y < gridSize; y += stride) {
            for (let x = 0; x < gridSize; x += stride) {
                const idx = (y * gridSize + x) * 4;
                sampled[si++] = gpuPixelBuffer.current[idx];
                if (si >= sampled.length) break;
            }
            if (si >= sampled.length) break;
        }

        // Update cells state only for small grids (to support TorusView etc.)
        if (gridSize <= 256) {
            const fullCpu = new Float32Array(gridSize * gridSize);
            for (let i = 0; i < gridSize * gridSize; i++) {
                fullCpu[i] = gpuPixelBuffer.current[i * 4];
            }
            setCells(fullCpu);
            onCellsUpdate(fullCpu);
        }

        const stats = calculateStats(sampled, sampleSize);
        onStatsUpdate(stats);
        onEntropyChange(stats.continuousEntropy);

    });

    

    useEffect(() => {
        // no-op: previous zero-check removed for performance
    }, []);

    return (
        <mesh
            ref={meshRef}
            onPointerMove={handlePointerMove}
            position={[0, 0, 0]}
        >
            <planeGeometry args={[viewport.width, viewport.height]} />
            <shaderMaterial
                ref={displayMaterialRef}
                args={[{
                    uniforms: { uTexture: { value: null } },
                    vertexShader: displayVert,
                    fragmentShader: displayFrag
                }]}
            />
        </mesh>
    );
};

export default GameOfLife;