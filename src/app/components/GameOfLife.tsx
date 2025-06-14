import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateSpatialEntropy, calculatePatternComplexity } from '../utils/entropyCalculations';
import { Vector2 } from 'three';
import { GPUComputationRenderer } from '../utils/gpuCompute';

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

// GLSL fragment shader that computes the next automaton state on the GPU
const fragmentShader = /* glsl */`
uniform float gridSize;
uniform float innerR;
uniform float outerR;
uniform float birthLow;
uniform float birthHigh;
uniform float deathLow;
uniform float deathHigh;

void main() {
    vec2 uv = gl_FragCoord.xy / gridSize;
    float outerSum = 0.0;
    float outerCount = 0.0;

    for (int dy = -5; dy <= 5; ++dy) {
        for (int dx = -5; dx <= 5; ++dx) {
            float dist = length(vec2(float(dx), float(dy)));
            if (dist <= outerR && dist > innerR) {
                vec2 uvOff = fract(uv + vec2(float(dx), float(dy)) / gridSize);
                float v = texture2D(textureState, uvOff).r;
                outerSum += v;
                outerCount += 1.0;
            }
        }
    }

    float s = outerCount == 0.0 ? 0.0 : outerSum / outerCount;
    float current = texture2D(textureState, uv).r;
    float n = 0.0;
    if (current > 0.5) {
        n = (s >= deathLow && s <= deathHigh) ? 1.0 : 0.0;
    } else {
        n = (s >= birthLow && s <= birthHigh) ? 1.0 : 0.0;
    }

    float nextVal = current + 0.5 * (n - current);
    gl_FragColor = vec4(nextVal, nextVal, nextVal, 1.0);
}`;

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
    const gpuComputeRef = useRef<GPUComputationRenderer | null>(null);
    const computeVarRef = useRef<any>(null);
    const gpuPixelBuffer = useRef<Float32Array | null>(null);
    const [cells, setCells] = useState<Float32Array>(new Float32Array(gridSize * gridSize));
    const lastUpdateTime = useRef(0);
    const { viewport, gl } = useThree();
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

    useEffect(() => {
        // Initialize GPU compute when WebGL context is ready
        if (!gl) return;

        const gpuCompute = new GPUComputationRenderer(gridSize, gridSize, gl);

        const dt = gpuCompute.createTexture();
        const initGrid = initializeGrid();
        const data = dt.image.data as Float32Array;
        for (let i = 0; i < gridSize * gridSize; i++) {
            const v = initGrid[i];
            const idx = i * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = v;
            data[idx + 3] = 1;
        }

        const variable = gpuCompute.addVariable('textureState', fragmentShader, dt);
        gpuCompute.setVariableDependencies(variable, [variable]);

        Object.assign(variable.material.uniforms, {
            gridSize: { value: gridSize },
            innerR: { value: 3.0 },
            outerR: { value: 5.0 },
            birthLow: { value: 0.278 },
            birthHigh: { value: 0.365 },
            deathLow: { value: 0.267 },
            deathHigh: { value: 0.445 }
        });

        const err = gpuCompute.init();
        if (err) {
            console.error('GPUComputationRenderer init error', err);
        }

        gpuComputeRef.current = gpuCompute;
        computeVarRef.current = variable;
        gpuPixelBuffer.current = new Float32Array(gridSize * gridSize * 4);

        setCells(initGrid);
    }, [gl, gridSize, initializeGrid]);

    useFrame((_, delta) => {
        if (!gpuComputeRef.current || !computeVarRef.current || !gpuPixelBuffer.current) return;

        lastUpdateTime.current += delta;
        if (lastUpdateTime.current < 1 / speed) return;
        lastUpdateTime.current = 0;

        gpuComputeRef.current.compute();

        const renderTarget = gpuComputeRef.current.getCurrentRenderTarget(computeVarRef.current);
        gl.readRenderTargetPixels(renderTarget, 0, 0, gridSize, gridSize, gpuPixelBuffer.current);

        const newCells = new Float32Array(gridSize * gridSize);
        for (let i = 0; i < gridSize * gridSize; i++) {
            newCells[i] = gpuPixelBuffer.current[i * 4];
        }

        setCells(newCells);
        onCellsUpdate(Array.from(newCells));

        const stats = calculateStats(newCells);
        onStatsUpdate(stats);
        onEntropyChange(stats.entropy);

        updateMesh(newCells);
    });

    const updateMesh = useCallback(
        (cellsData: Float32Array = cells) => {
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
                tempColor.setHSL(0.3, 1, cellsData[i] * 0.5);  // Adjust color based on cell state
                meshRef.current.setColorAt(i, tempColor);
            }
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        },
        [gridSize, cellSize]
    );

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