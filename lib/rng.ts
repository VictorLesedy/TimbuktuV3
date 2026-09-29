/** Small seeded PRNG so the mock world is identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number) {
  const next = mulberry32(seed);
  let counter = 0;
  return {
    next,
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    float(min: number, max: number): number {
      return next() * (max - min) + min;
    },
    chance(p: number): boolean {
      return next() < p;
    },
    pick<T>(items: readonly T[]): T {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error("pick() called with an empty list");
      return item;
    },
    weighted<T>(items: readonly (readonly [T, number])[]): T {
      const total = items.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [value, w] of items) {
        r -= w;
        if (r <= 0) return value;
      }
      const last = items[items.length - 1];
      if (!last) throw new Error("weighted() called with an empty list");
      return last[0];
    },
    id(prefix: string): string {
      counter += 1;
      return `${prefix}_${counter.toString(36)}${Math.floor(next() * 1e6).toString(36)}`;
    },
  };
}

export type Rng = ReturnType<typeof makeRng>;
