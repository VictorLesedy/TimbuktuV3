/*
 * The close: a gold satin ticket. A finely divided plane cut to a ticket's outline
 * (notches, perforations) by an alpha map, with a silk sheen. It ripples gently at rest,
 * and each scroll gives it a push: a spring turns the scroll speed into a jiggle that
 * shakes through the cloth and settles. Built in code; nothing is fetched at runtime.
 */
import { Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useMemo, useRef, type RefObject } from 'react';
import { CanvasTexture, Color, DoubleSide, MeshPhysicalMaterial, NeutralToneMapping, PlaneGeometry, SRGBColorSpace } from 'three';
import type { Group } from 'three';

const W = 3.6;
const H = 1.8;

/** The ticket's face (satin weave, engraving) and its outline (notches, perforations) as two canvases. */
function textures() {
    const w = 1440;
    const h = 720;
    const make = () => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    };
    const stubX = w * 0.71;
    const r = 34;

    // Outline: white is ticket, black is cut away.
    const shape = make();
    const s = shape.getContext('2d')!;
    s.fillStyle = '#000';
    s.fillRect(0, 0, w, h);
    s.fillStyle = '#fff';
    s.beginPath();
    s.roundRect(0, 0, w, h, 48);
    s.fill();
    s.globalCompositeOperation = 'destination-out';
    for (const y of [0, h]) {
        s.beginPath();
        s.arc(stubX, y, 46, 0, Math.PI * 2);
        s.fill();
    }
    for (let i = 0; i < 11; i++) {
        s.beginPath();
        s.arc(stubX, 90 + ((h - 180) * i) / 10, 9, 0, Math.PI * 2);
        s.fill();
    }
    s.globalCompositeOperation = 'source-over';

    // Face: gold satin with a fine weave, a border and the engraving.
    const face = make();
    const f = face.getContext('2d')!;
    const g = f.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f3d27a');
    g.addColorStop(0.5, '#e7b852');
    g.addColorStop(1, '#c99636');
    f.fillStyle = g;
    f.fillRect(0, 0, w, h);
    f.globalAlpha = 0.07;
    f.strokeStyle = '#ffffff';
    for (let x = -h; x < w; x += 6) {
        f.beginPath();
        f.moveTo(x, 0);
        f.lineTo(x + h, h);
        f.stroke();
    }
    f.globalAlpha = 1;
    const ink = 'rgba(98, 66, 14, 0.82)';
    f.strokeStyle = ink;
    f.lineWidth = 6;
    f.beginPath();
    f.roundRect(36, 36, stubX - 72, h - 72, r);
    f.stroke();
    f.fillStyle = ink;
    f.textBaseline = 'middle';
    f.font = '600 44px "Red Hat Text Variable", "Segoe UI", sans-serif';
    f.fillText('timbuktu', 90, 120);
    f.font = '900 190px "Red Hat Display Variable", "Arial Black", sans-serif';
    f.fillText('KARIBU', 82, h / 2 + 10);
    f.font = '600 40px "Red Hat Text Variable", "Segoe UI", sans-serif';
    f.fillText('ADMIT ONE · SCANNED AT THE GATE', 90, h - 120);
    f.save();
    f.translate(stubX + (w - stubX) / 2, h / 2);
    f.rotate(-Math.PI / 2);
    f.textAlign = 'center';
    f.font = '800 70px "Red Hat Display Variable", "Arial Black", sans-serif';
    f.fillText('ADMIT ONE', 0, -40);
    f.font = '600 34px "Red Hat Text Variable", "Segoe UI", sans-serif';
    f.fillText('No. 0042', 0, 40);
    f.restore();

    // Foil: where the stamp sits (the name, the border, the stub), white on black. It
    // drives the iridescent foil in the fragment shader and doubles as the emboss map.
    const foilCanvas = make();
    const o = foilCanvas.getContext('2d')!;
    o.fillStyle = '#000';
    o.fillRect(0, 0, w, h);
    o.fillStyle = '#fff';
    o.strokeStyle = '#fff';
    o.lineWidth = 6;
    o.beginPath();
    o.roundRect(36, 36, stubX - 72, h - 72, r);
    o.stroke();
    o.textBaseline = 'middle';
    o.font = '900 190px "Red Hat Display Variable", "Arial Black", sans-serif';
    o.fillText('KARIBU', 82, h / 2 + 10);
    o.save();
    o.translate(stubX + (w - stubX) / 2, h / 2);
    o.rotate(-Math.PI / 2);
    o.textAlign = 'center';
    o.font = '800 70px "Red Hat Display Variable", "Arial Black", sans-serif';
    o.fillText('ADMIT ONE', 0, -40);
    o.restore();

    const map = new CanvasTexture(face);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 8;
    const alpha = new CanvasTexture(shape);
    const foil = new CanvasTexture(foilCanvas);
    foil.anisotropy = 8;
    return { map, alpha, foil };
}

/** Satin: a sheen layer over a semi-metallic gold, with ripples and the jiggle added in the vertex shader. */
function useSilk() {
    return useMemo(() => {
        const { map, alpha, foil } = textures();
        const uniforms = { uTime: { value: 0 }, uJiggle: { value: 0 }, uSweep: { value: 0 }, uFoil: { value: foil } };
        const material = new MeshPhysicalMaterial({
            map,
            alphaMap: alpha,
            alphaTest: 0.5,
            side: DoubleSide,
            metalness: 0.55,
            roughness: 0.34,
            sheen: 1,
            sheenColor: new Color('#fff0c9'),
            sheenRoughness: 0.35,
            clearcoat: 0.35,
            clearcoatRoughness: 0.3,
            envMapIntensity: 1.3,
            // The stamp is pressed into the satin, so it catches the light at its edges.
            bumpMap: foil,
            bumpScale: 2.5,
            anisotropy: 0.5,
            anisotropyRotation: Math.PI / 4,
        });
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = uniforms.uTime;
            shader.uniforms.uJiggle = uniforms.uJiggle;
            shader.uniforms.uSweep = uniforms.uSweep;
            shader.uniforms.uFoil = uniforms.uFoil;
            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uTime;
                    uniform float uJiggle;
                    // Height of the cloth at (x, y): two slow folds, plus a quicker shiver while jiggling.
                    float silk(vec2 p) {
                        float a = 0.11 + 0.32 * abs(uJiggle);
                        float rest = sin(p.x * 1.4 + uTime * 0.9 + p.y * 0.6) * 0.6 + sin(p.y * 2.1 - uTime * 0.7 + p.x * 0.5) * 0.4;
                        float shiver = sin(p.x * 3.2 - uTime * 7.0) * cos(p.y * 2.6 + uTime * 5.0);
                        return a * rest + uJiggle * 0.18 * shiver;
                    }`,
                )
                .replace(
                    '#include <beginnormal_vertex>',
                    `#include <beginnormal_vertex>
                    float e = 0.01;
                    float hz = silk(position.xy);
                    float dx = (silk(position.xy + vec2(e, 0.0)) - hz) / e;
                    float dy = (silk(position.xy + vec2(0.0, e)) - hz) / e;
                    objectNormal = normalize(vec3(-dx, -dy, 1.0));`,
                )
                .replace('#include <begin_vertex>', `#include <begin_vertex>\n                    transformed.z += silk(position.xy);`);
            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uTime;
                    uniform float uSweep;
                    uniform sampler2D uFoil;`,
                )
                .replace(
                    '#include <normal_fragment_maps>',
                    `#include <normal_fragment_maps>
                    // Holographic foil: a thin-film rainbow that shifts with the viewing angle,
                    // the cloth's folds and the scroll, on a mirror-like metal.
                    float foilMask = texture2D(uFoil, vMapUv).r;
                    float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
                    float film = facing * 2.4 + vMapUv.x * 1.6 - vMapUv.y * 0.8 + uSweep * 2.5 + uTime * 0.08;
                    vec3 rainbow = 0.55 + 0.45 * cos(6.2831853 * (film + vec3(0.0, 0.33, 0.67)));
                    vec3 gold = vec3(1.0, 0.82, 0.42);
                    diffuseColor.rgb = mix(diffuseColor.rgb, mix(gold, rainbow * gold * 1.4, 0.6), foilMask);
                    metalnessFactor = mix(metalnessFactor, 1.0, foilMask);
                    roughnessFactor = mix(roughnessFactor, 0.14, foilMask);`,
                )
                .replace(
                    '#include <emissivemap_fragment>',
                    `#include <emissivemap_fragment>
                    // A band of light that runs across the satin as you scroll.
                    float band = vMapUv.x * 0.85 + (1.0 - vMapUv.y) * 0.35 - (uSweep * 2.2 - 0.6);
                    totalEmissiveRadiance += vec3(1.0, 0.86, 0.55) * exp(-band * band * 40.0) * (0.22 + 0.25 * foilMask);`,
                );
        };
        return { material, uniforms, geometry: new PlaneGeometry(W, H, 160, 80) };
    }, []);
}

/** Warm light panels, so the satin glows gold rather than brass. */
function Studio() {
    return (
        <Environment resolution={256} frames={1}>
            <color attach="background" args={['#2b2116']} />
            <Lightformer form="rect" intensity={3} color="#fff4dc" position={[0, 4, 3]} scale={[9, 2, 1]} />
            <Lightformer form="rect" intensity={2} color="#ffffff" position={[-5, 1, 3]} rotation-y={Math.PI / 2.5} scale={[4, 6, 1]} />
            <Lightformer form="rect" intensity={1.6} color="#ffb070" position={[5, -1, 2]} rotation-y={-Math.PI / 2.5} scale={[4, 5, 1]} />
            <Lightformer form="rect" intensity={1} color="#fff1d0" position={[2, 1, 9]} scale={[6, 3, 1]} />
        </Environment>
    );
}

function NeutralTone() {
    useFrame(({ gl }) => {
        if (gl.toneMapping !== NeutralToneMapping) gl.toneMapping = NeutralToneMapping;
    });
    return null;
}

/** Scroll speed drives a damped spring; the spring's swing is the jiggle. */
function Rig({ progress, reduced }: { progress: RefObject<number>; reduced: boolean }) {
    const group = useRef<Group>(null);
    const silk = useSilk();
    const state = useRef({ last: 0, x: 0, v: 0, p: 0 });
    useFrame(({ clock, size, pointer }, delta) => {
        const g = group.current;
        if (!g) return;
        const dt = Math.min(delta, 1 / 30);
        const s = state.current;
        const p = progress.current;
        const speed = reduced ? 0 : (p - s.last) / Math.max(dt, 1e-3);
        s.last = p;
        // Push the spring with the scroll, then let it ring down.
        s.v += speed * 6 * dt;
        s.v += (-60 * s.x - 7 * s.v) * dt;
        s.x += s.v * dt;
        s.x = Math.max(-1.6, Math.min(1.6, s.x));
        easing.damp(s, 'p', p, 0.25, dt);
        silk.uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
        silk.uniforms.uJiggle.value = s.x;
        silk.uniforms.uSweep.value = s.p;

        const aspect = size.width / size.height;
        const wide = aspect >= 1;
        g.scale.setScalar(wide ? Math.min(1.05, aspect * 0.6) : Math.min(0.62, aspect * 1.2));
        g.position.set(wide ? Math.min(1.2, aspect * 0.7) : 0, wide ? 0.1 : 1.1, 0);
        g.rotation.set(-0.25 + s.x * 0.12 + pointer.y * 0.08, -0.5 + s.p * 0.6 + pointer.x * 0.12, 0.12 - s.p * 0.12 + s.x * 0.05);
    });
    return (
        <group ref={group}>
            <mesh geometry={silk.geometry} material={silk.material} />
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

export default function TicketStage({ progress, live, reduced = false, onReady }: { progress: RefObject<number>; live: boolean; reduced?: boolean; onReady?: () => void }) {
    return (
        <Canvas
            dpr={[1, 1.75]}
            frameloop={live ? 'always' : 'never'}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            camera={{ fov: 30, near: 0.1, far: 50, position: [0, 0, 8] }}
            eventSource={typeof document !== 'undefined' ? document.body : undefined}
            eventPrefix="client"
        >
            <NeutralTone />
            <Studio />
            <Rig progress={progress} reduced={reduced} />
            <Ready onReady={onReady} />
        </Canvas>
    );
}
