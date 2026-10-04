/*
 * The scene change between the hero and the listings: two silk stage curtains. Each is a
 * finely divided plane bent in the vertex shader into pleats that bunch up as the curtain
 * gathers towards its side, with the hem trailing behind when the scroll moves fast. The
 * fragment shader darkens the inside of each fold and the top under the rail; the silk
 * highlight is the material's anisotropic sheen. Scroll sets how far open they are.
 */
import { Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, DoubleSide, MeshPhysicalMaterial, NeutralToneMapping, PlaneGeometry } from 'three';
import { paletteColor } from '@/lib/palette';

type Uniforms = Record<'uOpen' | 'uTime' | 'uSwing' | 'uW' | 'uH' | 'uOuterX' | 'uDir' | 'uPleats', { value: number }>;

function useCurtain(dir: 1 | -1) {
    return useMemo(() => {
        const base = new Color(paletteColor('--a-400')).lerp(new Color(paletteColor('--b-950')), 0.52);
        const uniforms: Uniforms = {
            uOpen: { value: 1 },
            uTime: { value: 0 },
            uSwing: { value: 0 },
            uW: { value: 1 },
            uH: { value: 1 },
            uOuterX: { value: 0 },
            uDir: { value: dir },
            uPleats: { value: 9 },
        };
        const material = new MeshPhysicalMaterial({
            color: base,
            side: DoubleSide,
            roughness: 0.34,
            metalness: 0,
            sheen: 1,
            sheenRoughness: 0.32,
            sheenColor: base.clone().lerp(new Color('#ffe2c4'), 0.7),
            anisotropy: 0.8,
            anisotropyRotation: Math.PI / 2,
            envMapIntensity: 1.1,
        });
        material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, uniforms);
            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uOpen, uTime, uSwing, uW, uH, uOuterX, uDir, uPleats;
                    varying float vFold;
                    varying float vV;
                    // Pleats are not all the same width: the phase wanders a little across the cloth.
                    float pleat(float u) {
                        return u * uPleats * 6.2831853 + 0.9 * sin(u * 7.3 + 1.7) + 0.5 * sin(u * 17.0);
                    }
                    // Where a point of the cloth sits: q runs -0.5..0.5 across and up the plane.
                    vec3 curtainAt(vec2 q) {
                        float u = q.x + 0.5;   // 0 at the wall end of the rail, 1 at the leading edge
                        float v = q.y + 0.5;   // 0 at the hem, 1 at the rail
                        float o = uOpen;
                        float width = uW * mix(1.0, 0.2, o);
                        float outer = uOuterX - uDir * uW * 0.42 * o * o;
                        float lag = uSwing * (1.0 - v) * (1.0 - v) * (0.25 + 0.75 * u);
                        float x = outer + uDir * (u * width + lag);
                        float amp = uW * mix(0.03, 0.08, o) * (0.7 + 0.3 * v) * (0.8 + 0.2 * sin(u * 11.0 + 0.5));
                        float z = amp * sin(pleat(u))
                            + uW * 0.014 * sin(v * 5.0 + u * 9.0 + uTime * 0.9) * (1.0 - v)
                            + uSwing * 0.25 * sin(u * 14.0 - uTime * 3.0) * (1.0 - v);
                        return vec3(x, (v - 0.5) * uH, z);
                    }`,
                )
                .replace(
                    '#include <beginnormal_vertex>',
                    `float ee = 0.002;
                    vec3 c0 = curtainAt(position.xy);
                    vec3 objectNormal = normalize(cross(curtainAt(position.xy + vec2(ee, 0.0)) - c0, curtainAt(position.xy + vec2(0.0, ee)) - c0));
                    #ifdef USE_TANGENT
                        vec3 objectTangent = vec3(tangent.xyz);
                    #endif`,
                )
                .replace(
                    '#include <begin_vertex>',
                    `vec3 transformed = c0;
                    vFold = sin(pleat(position.x + 0.5));
                    vV = position.y + 0.5;`,
                );
            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying float vFold;
                    varying float vV;`,
                )
                .replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                    // Light falls off into the back of each fold and under the rail.
                    float crest = smoothstep(-1.0, 1.0, vFold);
                    diffuseColor.rgb *= mix(0.16, 1.0, pow(crest, 1.3));
                    diffuseColor.rgb *= mix(1.0, 0.55, smoothstep(0.86, 1.0, vV));`,
                );
        };
        return { material, uniforms };
    }, [dir]);
}

function Curtains({ open, reduced }: { open: RefObject<number>; reduced: boolean }) {
    const left = useCurtain(1);
    const right = useCurtain(-1);
    const geometry = useMemo(() => new PlaneGeometry(1, 1, 220, 48), []);
    const camera = useThree((s) => s.camera);
    const state = useRef({ last: 1, swing: 0, v: 0 });

    useFrame(({ clock, size, viewport }, delta) => {
        const dt = Math.min(delta, 1 / 30);
        const vp = viewport.getCurrentViewport(camera, [0, 0, 0], size);
        const o = open.current ?? 1;
        const s = state.current;
        // The hem trails the rail: a spring pushed by how fast the curtains move.
        const speed = reduced ? 0 : (o - s.last) / Math.max(dt, 1e-3);
        s.last = o;
        s.v += (-speed * 0.12 - 40 * s.swing - 6 * s.v) * dt;
        s.swing = Math.max(-0.6, Math.min(0.6, s.swing + s.v * dt));
        const w = vp.width * 0.58;
        for (const [c, side] of [
            [left, -1],
            [right, 1],
        ] as const) {
            const u = c.uniforms;
            u.uOpen.value = o;
            u.uTime.value = reduced ? 0 : clock.elapsedTime;
            u.uSwing.value = s.swing * vp.width * 0.12;
            u.uW.value = w;
            u.uH.value = vp.height * 1.12;
            u.uOuterX.value = side * vp.width * 0.55;
            // Pleats keep a cloth-like width: fewer of them on a narrow phone screen.
            u.uPleats.value = Math.round(4 + 5 * Math.min(1, vp.width / vp.height / 1.6));
        }
    });

    return (
        <>
            <mesh geometry={geometry} material={left.material} frustumCulled={false} />
            <mesh geometry={geometry} material={right.material} frustumCulled={false} position-z={0.01} />
        </>
    );
}

/** Soft stage light: a warm wash from above and the front, so the folds read. */
function Stage() {
    return (
        <>
            <Environment resolution={256} frames={1}>
                <color attach="background" args={['#120d0a']} />
                <Lightformer form="rect" intensity={2.6} color="#fff1dc" position={[0, 5, 4]} scale={[10, 2, 1]} />
                <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[-6, 1, 4]} rotation-y={Math.PI / 3} scale={[4, 8, 1]} />
                <Lightformer form="rect" intensity={1.2} color="#ffd2a8" position={[6, 1, 4]} rotation-y={-Math.PI / 3} scale={[4, 8, 1]} />
            </Environment>
            <directionalLight position={[-3, 6, 6]} intensity={1.6} color="#fff3e2" />
            <ambientLight intensity={0.15} />
        </>
    );
}

function NeutralTone() {
    useFrame(({ gl }) => {
        if (gl.toneMapping !== NeutralToneMapping) gl.toneMapping = NeutralToneMapping;
    });
    return null;
}

export default function CurtainStage({ open, live, reduced = false }: { open: RefObject<number>; live: boolean; reduced?: boolean }) {
    return (
        <Canvas
            dpr={[1, 1.5]}
            frameloop={live ? 'always' : 'never'}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            camera={{ fov: 30, near: 0.1, far: 50, position: [0, 0, 10] }}
        >
            <NeutralTone />
            <Stage />
            <Curtains open={open} reduced={reduced} />
        </Canvas>
    );
}
