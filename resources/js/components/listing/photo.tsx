import { photoUrl } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Photo as PhotoType } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useRef, useState } from 'react';

/**
 * A remote photo in two widths, lazy by default. A skeleton holds its place until it
 * has loaded, then the photo fades in; a missing image never leaves a broken icon or
 * shifts the layout.
 */
export function Photo({
    photo,
    width = 640,
    ratio = 4 / 3,
    className,
    imgClassName,
    eager,
    sizes = '(min-width: 768px) 33vw, 100vw',
}: {
    photo: PhotoType;
    width?: number;
    ratio?: number;
    className?: string;
    imgClassName?: string;
    eager?: boolean;
    sizes?: string;
}) {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const img = useRef<HTMLImageElement>(null);
    // A photo already in the cache can finish before React attaches onLoad.
    useEffect(() => {
        if (img.current?.complete && img.current.naturalWidth > 0) setLoaded(true);
    }, []);
    const h = (w: number) => Math.round(w / ratio);
    return (
        <div className={cn('relative overflow-hidden', className)} style={{ aspectRatio: ratio }}>
            {!loaded && !failed && <Skeleton className="absolute inset-0 rounded-none" />}
            {failed ? (
                <span role="img" aria-label={photo.alt} className="absolute inset-0 bg-secondary" />
            ) : (
                <img
                    ref={img}
                    src={photoUrl(photo.src, width, h(width))}
                    srcSet={`${photoUrl(photo.src, Math.round(width / 2), h(width / 2))} ${Math.round(width / 2)}w, ${photoUrl(photo.src, width, h(width))} ${width}w, ${photoUrl(photo.src, width * 2, h(width * 2))} ${width * 2}w`}
                    sizes={sizes}
                    alt={photo.alt}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                    className={cn('absolute inset-0 size-full object-cover transition-opacity duration-300 ease-out', loaded ? 'opacity-100' : 'opacity-0', imgClassName)}
                />
            )}
        </div>
    );
}
