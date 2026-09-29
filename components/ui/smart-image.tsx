"use client";

import Image, { type ImageProps } from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Photo over a generated duotone. If the remote photo is slow or missing,
 * the artwork holds the layout instead of a broken image icon.
 */
export function SmartImage({ hue, className, alt, ...props }: Omit<ImageProps, "alt" | "fill"> & { alt: string; hue: number }) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  return (
    <div
      className={cn("relative overflow-hidden bg-surface", className)}
      style={{
        backgroundImage: `radial-gradient(120% 80% at 15% 100%, hsl(${hue} 70% 55% / 0.55), transparent 60%), radial-gradient(90% 70% at 90% 0%, hsl(${(hue + 40) % 360} 70% 60% / 0.35), transparent 60%), linear-gradient(160deg, var(--color-raised), var(--color-surface))`,
      }}
    >
      {failed ? (
        <span role="img" aria-label={alt} className="absolute inset-0" />
      ) : (
        <Image
          alt={alt}
          fill
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
          {...props}
        />
      )}
    </div>
  );
}
