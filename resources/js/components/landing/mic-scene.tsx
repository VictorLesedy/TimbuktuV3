/*
 * The landing page's 3D object: a stage microphone built in code (chrome ball grille,
 * foam behind it, a silver band, a matte handle). It stands in front of the giant name
 * and answers the scroll: it turns, tilts toward you and steps forward, and leans a
 * little toward the pointer. Light comes from panels, so nothing is fetched at runtime.
 */
import { Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { paletteColor } from '@/lib/palette';
import { easing } from 'maath';
import { useMemo, useRef, type RefObject } from 'react';
import { CanvasTexture, DoubleSide, LatheGeometry, MeshStandardMaterial, NeutralToneMapping, RepeatWrapping, SphereGeometry, TorusGeometry, Vector2 } from 'three';
import type { Group } from 'three';

function smoothstep(a: number, b: number, v: number) {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

const R = 0.62; // grille radius

/** A fine woven wire pattern for the grille, drawn once and tiled over the sphere. */
function meshTexture(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(64, 64);
    ctx.moveTo(64, 0);
    ctx.lineTo(0, 64);
    ctx.stroke();
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(56, 28);
    t.anisotropy = 8;
    return t;
}

/** The grille: a woven wire shell with a few solid rings, over a dark foam ball. */
function useParts(night: boolean) {
    return useMemo(() => {
        const chrome = new MeshStandardMaterial({ color: '#e9edf5', metalness: 1, roughness: 0.16, envMapIntensity: night ? 1.2 : 1.5 });
        const wire = new MeshStandardMaterial({ color: '#dfe4ee', metalness: 1, roughness: 0.22, envMapIntensity: 1.4, alphaMap: meshTexture(), alphaTest: 0.5, side: DoubleSide });
        const satin = new MeshStandardMaterial({ color: '#c9d0de', metalness: 1, roughness: 0.32, envMapIntensity: 1.3 });
        const foam = new MeshStandardMaterial({ color: '#0b1430', metalness: 0, roughness: 1 });
        const handle = new MeshStandardMaterial({ color: night ? '#2a2a2c' : '#1a1a1c', metalness: 0.6, roughness: 0.28, envMapIntensity: 1.2, side: DoubleSide });

        // Solid rings at the crown, the equator and where the grille meets the handle.
        const rings = [0.28, 0.5, 0.72].map((f) => {
            const phi = f * Math.PI;
            return { geometry: new TorusGeometry(R * Math.sin(phi) + 0.004, 0.016, 10, 128), y: R * Math.cos(phi) };
        });

        // The handle: a long taper from the band down to a rounded end.
        const profile = [
            [0, -2.3],
            [0.17, -2.3],
            [0.215, -2.24],
            [0.24, -2.0],
            [0.3, -0.7],
            [0.36, -0.42],
            [0.4, -0.3],
            [0, -0.3],
        ].map(([x, y]) => new Vector2(x!, y!));
        return {
            chrome,
            satin,
            foam,
            handle,
            wire,
            rings,
            shell: new SphereGeometry(R, 96, 64),
            foamBall: new SphereGeometry(R * 0.94, 48, 32),
            body: new LatheGeometry(profile, 96),
            band: new TorusGeometry(0.43, 0.05, 16, 96),
            collar: new TorusGeometry(0.47, 0.04, 16, 96),
            end: new TorusGeometry(0.2, 0.025, 12, 64),
        };
    }, [night]);
}

function Microphone({ night }: { night: boolean }) {
    const p = useParts(night);
    return (
        <group>
            {/* Grille, centred on the origin of the head. */}
            <group position={[0, 0.3, 0]}>
                <mesh geometry={p.foamBall} material={p.foam} />
                <mesh geometry={p.shell} material={p.wire} />
                {p.rings.map((ring, i) => (
                    <mesh key={i} geometry={ring.geometry} material={p.chrome} position={[0, ring.y, 0]} rotation={[Math.PI / 2, 0, 0]} />
                ))}
            </group>
            <mesh geometry={p.collar} material={p.satin} position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={p.band} material={p.satin} position={[0, -0.34, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={p.body} material={p.handle} />
            <mesh geometry={p.end} material={p.satin} position={[0, -2.27, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
    );
}

/** Soft studio light: white panels above and to the sides, navy strips so the chrome carries the brand. */
function Studio({ night }: { night: boolean }) {
    // The palette's own colours, so the chrome carries whichever one is active.
    const tone = { mid: paletteColor('--b-700'), deep: paletteColor('--b-900'), accent: paletteColor('--a-300'), light: paletteColor('--b-100') };
    return (
        <Environment resolution={256} frames={1}>
            <color attach="background" args={[night ? tone.mid : tone.light]} />
            <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 5, 2]} scale={[10, 2, 1]} />
            <Lightformer form="rect" intensity={2} color="#ffffff" position={[-5, 1, 3]} rotation-y={Math.PI / 2.5} scale={[3, 8, 1]} />
            <Lightformer form="rect" intensity={1.6} color={tone.accent} position={[5, 0, 2]} rotation-y={-Math.PI / 2.5} scale={[3, 8, 1]} />
            <Lightformer form="rect" intensity={2.5} color={tone.deep} position={[0, -4, 1]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
            <Lightformer form="rect" intensity={1} color="#ffffff" position={[2, 2, 8]} scale={[3, 1.5, 1]} />
        </Environment>
    );
}

function NeutralTone() {
    useFrame(({ gl }) => {
        if (gl.toneMapping !== NeutralToneMapping) gl.toneMapping = NeutralToneMapping;
    });
    return null;
}

/**
 * Scroll story. At rest the microphone leans to one side in a three-quarter view. As the
 * page scrolls it turns about its axis, swings upright and toward the visitor, and grows
 * a little, while the name slides behind it.
 */
function Rig({ progress, night, reduced }: { progress: RefObject<number>; night: boolean; reduced: boolean }) {
    const group = useRef<Group>(null);
    const smooth = useRef({ p: 0, px: 0, py: 0, intro: reduced ? 1 : 0 });
    useFrame(({ clock, pointer, size }, delta) => {
        const g = group.current;
        if (!g) return;
        const s = smooth.current;
        const dt = Math.min(delta, 1 / 20);
        easing.damp(s, 'p', reduced ? 0 : progress.current, 0.18, dt);
        easing.damp(s, 'px', reduced ? 0 : pointer.x, 0.5, dt);
        easing.damp(s, 'py', reduced ? 0 : pointer.y, 0.5, dt);
        easing.damp(s, 'intro', 1, 0.9, dt);
        const t = reduced ? 0 : clock.elapsedTime;
        const aspect = size.width / size.height;
        const wide = aspect >= 1;
        const p = s.p;
        const upright = smoothstep(0, 0.8, p);

        const scale = (wide ? 1 : Math.min(1, aspect * 1.6)) * (0.9 + 0.1 * s.intro) * (1 + 0.14 * upright);
        g.scale.setScalar(scale);
        g.position.set(0, (wide ? 0.55 : 0.85) + Math.sin(t * 0.8) * 0.04 - (1 - s.intro) * 0.4 - 0.35 * upright, 0);
        // A full turn and a half over the hero, and the lean straightens out toward the visitor.
        g.rotation.set(0.12 + s.py * 0.12 + upright * 0.35, -0.6 + p * Math.PI * 1.5 + s.px * 0.25 + Math.sin(t * 0.3) * 0.05, -0.42 + upright * 0.42 + Math.sin(t * 0.5) * 0.02);
    });
    return (
        <group ref={group}>
            <Microphone night={night} />
        </group>
    );
}

function Ready({ onReady }: { onReady?: () => void }) {
    const done = useRef(false);
    useFrame(() => {
        if (!done.current) {
            done.current = true;
            onReady?.();
        }
    });
    return null;
}

export default function MicStage({
    progress,
    live,
    night = false,
    reduced = false,
    onReady,
}: {
    progress: RefObject<number>;
    live: boolean;
    night?: boolean;
    reduced?: boolean;
    onReady?: () => void;
}) {
    return (
        <Canvas
            dpr={[1, 1.75]}
            frameloop={live ? 'always' : 'never'}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            // Track the pointer over the whole page, so the canvas never blocks clicks on the copy.
            eventSource={typeof document !== 'undefined' ? document.body : undefined}
            eventPrefix="client"
            camera={{ fov: 30, near: 0.1, far: 50, position: [0, 0, 9.5] }}
        >
            <NeutralTone />
            <Studio night={night} />
            <Rig progress={progress} night={night} reduced={reduced} />
            <Ready onReady={onReady} />
        </Canvas>
    );
}
