import { ARTISTS, PHOTO_IDS, THEME_HUE, type Theme } from "../mock/catalog";
import type { Media } from "../schemas";

/* Reference data. A real API would serve these from lookup tables. */

export function listArtists(): readonly string[] {
  return ARTISTS;
}

export function samplePhotos(): Media[] {
  return (Object.keys(PHOTO_IDS) as Theme[]).flatMap((theme) =>
    (PHOTO_IDS[theme] ?? []).map((id, i) => ({
      url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`,
      alt: `Sample ${theme} photo ${i + 1}`,
      hue: THEME_HUE[theme],
    })),
  );
}
