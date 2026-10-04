/** Small seeded random generator (mulberry32), so the sample world is the same on every load. */
export function createRng(seed: number) {
    let a = seed >>> 0;
    const next = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        next,
        int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
        pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
        chance: (p: number) => next() < p,
        /** Picks an index with probability proportional to its weight. */
        weighted: (weights: readonly number[]) => {
            const total = weights.reduce((s, w) => s + w, 0);
            let r = next() * total;
            for (let i = 0; i < weights.length; i++) {
                r -= weights[i]!;
                if (r <= 0) return i;
            }
            return weights.length - 1;
        },
    };
}

export type Rng = ReturnType<typeof createRng>;

export function code(rng: Rng, length = 6): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < length; i++) out += alphabet[Math.floor(rng.next() * alphabet.length)];
    return out;
}
