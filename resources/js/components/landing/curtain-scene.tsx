/*
 * The stage curtain between the hero and the listings, drawn entirely in one fragment
 * shader on a full-screen quad (no mesh). Two halves of satin hang in long folds whose
 * line bends slowly along their length. As uOpen goes from 0 to 1 each half is drawn up
 * and out towards its top corner, like a theatre's tableau curtain: the folds gather
 * and swing diagonally towards the tie, the leading edge turns into shadow, and the
 * cloth casts a soft shadow on the page it uncovers. The cloth is lit from its slope,
 * with a broad sheen and a tight glint on each crest, through a ramp of the palette.
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, Vector3, type ShaderMaterial } from 'three';
import { paletteColor } from '@/lib/palette';

const vertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const fragment = /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uAspect;
    uniform float uOpen;
    uniform float uSwing;
    uniform vec3 uDeep;
    uniform vec3 uShade;
    uniform vec3 uBase;
    uniform vec3 uLit;
    uniform vec3 uSheen;
    uniform vec3 uGlint;

    // How far this height of a half is drawn aside: the hem goes first, the rail last.
    float drawn(float v) {
        float o = uOpen;
        return clamp(o * 1.55 - v * 0.55 * (1.0 - o * 0.6), 0.0, 1.0);
    }

    // Where the leading edge of a half sits at height v, in half-widths from the outer side.
    float edgeAt(float v) {
        float a = drawn(v);
        return 1.03 - 1.08 * a * a * (3.0 - 2.0 * a) + uSwing * (1.0 - v) * (1.0 - v);
    }

    // The cloth's height at a point of one half: s across (0 outer, 1 centre), v up.
    float drape(float s, float v, float e) {
        float t = uTime;
        float g = clamp(e, 0.08, 1.2);
        float f = s / g;                            // where on the flat cloth this point comes from
        float pull = (1.0 - v) * (1.0 - g) * 1.4;  // folds swing towards the tie as it gathers
        float x = f * 7.5 * (1.0 + 0.25 * uAspect) + pull * 3.0;
        float bend = 0.8 * sin(v * 2.2 + 0.6 * sin(f * 3.1 + t * 0.12) + t * 0.15) + 0.3 * sin(v * 4.3 - t * 0.1 + 2.0);
        float h = sin(x + bend);
        h += 0.45 * sin(x * 1.83 + bend * 1.3 + v * 0.7 + t * 0.2);
        h += 0.16 * sin(x * 3.7 + bend * 0.7 - v * 0.4 - t * 0.17);
        return h * (0.75 + 0.6 * (1.0 - g));         // gathered cloth folds deeper
    }

    void main() {
        // Mirror the right half onto the left, so one description serves both.
        float side = step(0.5, vUv.x);
        float s = side > 0.5 ? (1.0 - vUv.x) * 2.0 : vUv.x * 2.0;
        float v = vUv.y;
        float e = edgeAt(v);
        // Past the half-way mark the remaining bundle also lifts towards the rail.
        float lift = smoothstep(0.55, 1.0, uOpen);
        float hem = lift * 1.15 * (0.55 + 0.45 * s);
        float inside = e - s;   // > 0 on the cloth
        float above = v - hem;  // > 0 above the rising hem

        float px = fwidth(s) * 1.5;
        float cloth = smoothstep(-px, px, inside) * smoothstep(-px, px, above);

        // A soft shadow on the page just past the leading edge and under the hem.
        float gap = max(-inside, -above);
        float shadow = (1.0 - smoothstep(0.0, 0.09, gap)) * 0.45 * (1.0 - cloth) * (1.0 - smoothstep(0.55, 0.8, uOpen));

        float de = 0.004;
        float h = drape(s, v, e);
        vec2 slope = vec2(drape(s + de, v, e) - h, drape(s, v + de, edgeAt(v + de)) - h) / de;
        slope.x *= side > 0.5 ? -1.0 : 1.0;
        vec3 n = normalize(vec3(-slope * vec2(0.035, 0.05), 1.0));
        vec3 light = normalize(vec3(-0.35, 0.8, 0.5));
        vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
        float diffuse = clamp(dot(n, light), 0.0, 1.0);
        float facing = max(dot(n, halfway), 0.0);
        float sheen = pow(facing, 12.0);
        float glint = pow(facing, 80.0);

        vec3 color = mix(uDeep, uShade, smoothstep(0.05, 0.4, diffuse));
        color = mix(color, uBase, smoothstep(0.35, 0.7, diffuse));
        color = mix(color, uLit, smoothstep(0.65, 0.95, diffuse));
        color = mix(color, uSheen, sheen * 0.55);
        color = mix(color, uGlint, glint * 0.4);

        // The leading edge turns away into shadow; the rail and the hem sit darker.
        color = mix(uDeep, color, smoothstep(0.0, 0.06, inside));
        color = mix(color, uDeep, smoothstep(0.78, 1.0, v) * 0.95);
        color = mix(color, uDeep, (1.0 - smoothstep(0.0, 0.12, above)) * 0.5);
        // Light pools in the middle of the stage.
        float pool = smoothstep(1.2, 0.2, length((vUv - vec2(0.5, 0.62)) * vec2(1.0, 1.3)));
        color = mix(uDeep, color, 0.45 + 0.55 * pool);

        // Premultiplied: cloth where there is cloth, a black shadow beside it.
        float alpha = max(cloth, shadow);
        gl_FragColor = vec4(color * cloth, alpha);
    }
`;

const srgb = (hex: string) => {
    const c = new Color(hex);
    return new Vector3(c.r, c.g, c.b);
};
const mixHex = (a: string, b: string, t: number) => '#' + new Color(a).lerp(new Color(b), t).getHexString();

function Satin({ open, reduced }: { open: RefObject<number>; reduced: boolean }) {
    const material = useRef<ShaderMaterial>(null);
    const state = useRef({ o: open.current ?? 0, last: open.current ?? 0, swing: 0, v: 0 });
    const uniforms = useMemo(() => {
        // The ramp comes from the palette: near-black, the accent deepened, the accent, its tint.
        const deep = paletteColor('--b-950');
        const accent = paletteColor('--a-400');
        const bright = paletteColor('--a-300');
        return {
            uTime: { value: 0 },
            uAspect: { value: 1 },
            uOpen: { value: 0 },
            uSwing: { value: 0 },
            uDeep: { value: srgb(mixHex(accent, deep, 0.9)) },
            uShade: { value: srgb(mixHex(accent, deep, 0.72)) },
            uBase: { value: srgb(mixHex(accent, deep, 0.45)) },
            uLit: { value: srgb(mixHex(bright, deep, 0.12)) },
            uSheen: { value: srgb(bright) },
            uGlint: { value: srgb(paletteColor('--a-100')) },
        };
    }, []);

    useFrame(({ clock, size }, delta) => {
        const m = material.current;
        if (!m) return;
        const dt = Math.min(delta, 1 / 30);
        const s = state.current;
        // The scroll sets the target; the cloth follows it with a little weight.
        if (reduced) s.o = open.current ?? 0;
        else easing.damp(s, 'o', open.current ?? 0, 0.12, dt);
        const speed = (s.o - s.last) / Math.max(dt, 1e-3);
        s.last = s.o;
        // The hem trails the rail on a soft spring.
        s.v += (-speed * 0.25 - 30 * s.swing - 7 * s.v) * dt;
        s.swing = Math.max(-0.25, Math.min(0.25, s.swing + s.v * dt));
        const u = m.uniforms;
        u.uTime!.value = reduced ? 0 : clock.elapsedTime;
        u.uAspect!.value = size.width / size.height;
        u.uOpen!.value = s.o;
        u.uSwing!.value = reduced ? 0 : s.swing;
    });

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={material}
                uniforms={uniforms}
                vertexShader={vertex}
                fragmentShader={fragment}
                transparent
                premultipliedAlpha
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
            />
        </mesh>
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

export default function CurtainStage({ open, live, reduced = false, onReady }: { open: RefObject<number>; live: boolean; reduced?: boolean; onReady?: () => void }) {
    return (
        <Canvas dpr={[1, 1.5]} frameloop={live ? 'always' : 'never'} gl={{ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }} flat linear>
            <Satin open={open} reduced={reduced} />
            <Ready onReady={onReady} />
        </Canvas>
    );
}
