/*
 * The stage curtain between the hero and the listings, drawn entirely in one fragment
 * shader on a full-screen quad (no mesh). Two halves of satin hang in a few broad folds
 * whose line bends slowly along their length. As uOpen goes from 0 to 1 each half is drawn up
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
    uniform vec3 uWine;
    uniform vec3 uBase;
    uniform vec3 uSheen;
    uniform vec3 uGlint;

    // How far this height of a half is drawn aside: the hem goes first, the rail last.
    float drawn(float v) {
        float o = uOpen;
        return clamp(o * 1.55 - v * 0.55 * (1.0 - o * 0.6), 0.0, 1.0);
    }

    // Where the leading edge of a half sits at height v, in half-widths from the outer side.
    // Fully drawn, it is well past the outer side, so neither cloth nor shadow is left on screen.
    float edgeAt(float v) {
        float a = drawn(v);
        return 1.06 - 1.33 * a * a * (3.0 - 2.0 * a) + uSwing * (1.0 - v) * (1.0 - v);
    }

    // Satin: a few broad folds whose line bends slowly along their length, with two finer
    // ripples riding on them. s runs across a half (0 outer, 1 centre), v up, e is the edge.
    float drape(float s, float v, float e) {
        float t = uTime;
        float g = clamp(e, 0.1, 1.2);
        float f = s / g;                                   // where on the flat cloth this point comes from
        vec2 q = vec2(f * 1.2 * uAspect, v * 2.4);         // the same scale across as up, as on screen
        float lean = 0.18 + (1.0 - v) * (1.0 - g) * 0.9;   // folds swing towards the tie as it gathers
        vec2 r = vec2(q.x * cos(lean) - q.y * sin(lean), q.x * sin(lean) + q.y * cos(lean));
        float bend = 0.9 * sin(r.y * 0.8 + 0.7 * sin(r.x * 0.6 + t * 0.1) + t * 0.14) + 0.35 * sin(r.y * 1.6 - t * 0.1 + 2.0);
        float h = sin(r.x * 1.9 + bend);
        h += 0.5 * sin(r.x * 3.3 + bend * 1.4 + r.y * 0.5 + t * 0.18);
        h += 0.18 * sin(r.x * 6.4 + bend * 0.8 - r.y * 0.3 - t * 0.15);
        return h * (1.0 + 0.5 * (1.0 - g));                // gathered cloth folds deeper
    }

    void main() {
        // Mirror the right half onto the left, so one description serves both.
        float right = step(0.5, vUv.x);
        float s = right > 0.5 ? (1.0 - vUv.x) * 2.0 : vUv.x * 2.0;
        float v = vUv.y;
        float e = edgeAt(v);
        float inside = e - s;   // > 0 on the cloth
        float px = fwidth(s) * 1.5;
        float cloth = smoothstep(-px, px, inside);

        // A soft shadow on the page just past the leading edge, gone before the cloth is.
        float shadow = (1.0 - smoothstep(0.0, 0.06, -inside)) * 0.4 * (1.0 - cloth) * (1.0 - smoothstep(0.55, 0.8, uOpen));

        // Light the cloth from its slope (per unit of the scaled space above), as satin.
        float de = 0.003;
        float h = drape(s, v, e);
        float dx = (drape(s + de, v, e) - h) / (de * 1.2 * uAspect);
        float dy = (drape(s, v + de, edgeAt(v + de)) - h) / (de * 2.4);
        vec2 slope = vec2(right > 0.5 ? -dx : dx, dy);
        vec3 n = normalize(vec3(-slope * 0.6, 1.0));
        vec3 light = normalize(vec3(-0.2, 0.8, 0.55));
        vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
        float diffuse = clamp(dot(n, light), 0.0, 1.0);
        float facing = max(dot(n, halfway), 0.0);
        float sheen = pow(facing, 14.0);
        float glint = pow(facing, 90.0);

        vec3 color = mix(uDeep, uWine, smoothstep(0.1, 0.5, diffuse));
        color = mix(color, uBase, smoothstep(0.45, 0.88, diffuse));
        color = mix(color, uSheen, sheen * 0.6);
        color = mix(color, uGlint, glint * 0.45);

        // The leading edge turns away into shadow, and the top sits in the shade of the rail.
        color = mix(uDeep, color, smoothstep(0.0, 0.03, inside));
        color = mix(color, uDeep, smoothstep(0.88, 1.0, v) * 0.6);
        float vignette = smoothstep(1.25, 0.3, length((vUv - 0.5) * vec2(1.1, 1.25)));
        color = mix(uDeep, color, 0.65 + 0.35 * vignette);

        // Premultiplied: cloth where there is cloth, a black shadow beside it.
        gl_FragColor = vec4(color * cloth, max(cloth, shadow));
    }
`;

const srgb = (hex: string) => {
    const c = new Color(hex);
    return new Vector3(c.r, c.g, c.b);
};

function Satin({ open, reduced }: { open: RefObject<number>; reduced: boolean }) {
    const material = useRef<ShaderMaterial>(null);
    const state = useRef({ o: open.current ?? 0, last: open.current ?? 0, swing: 0, v: 0 });
    const uniforms = useMemo(() => {
        // The ramp keeps the accent's hue at satin's lightness steps (shadow, depth, body,
        // sheen), so a dark accent still gives vivid cloth rather than mud.
        const hsl = { h: 0, s: 0, l: 0 };
        new Color(paletteColor('--a-300')).getHSL(hsl);
        const tone = (l: number) => {
            const c = new Color().setHSL(hsl.h, Math.max(0.78, hsl.s), l);
            return new Vector3(c.r, c.g, c.b);
        };
        return {
            uTime: { value: 0 },
            uAspect: { value: 1 },
            uOpen: { value: 0 },
            uSwing: { value: 0 },
            uDeep: { value: tone(0.21) },
            uWine: { value: tone(0.29) },
            uBase: { value: tone(0.41) },
            uSheen: { value: tone(0.56) },
            uGlint: { value: srgb('#f5f3f4') },
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
