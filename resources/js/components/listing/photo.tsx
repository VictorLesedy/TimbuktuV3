import { photoUrl } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Photo as PhotoType } from '@/types';
import { useState } from 'react';

/**
 * A remote photo in two widths, lazy by default, over a plain fill so a slow or
 * missing image never leaves a broken icon or shifts the layout.
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
    const h = (w: number) => Math.round(w / ratio);
    return (
        <div className={cn('relative overflow-hidden bg-muted', className)} style={{ aspectRatio: ratio }}>
            {failed ? (
                <span role="img" aria-label={photo.alt} className="absolute inset-0 bg-secondary" />
            ) : (
                <img
                    src={photoUrl(photo.src, width, h(width))}
                    srcSet={`${photoUrl(photo.src, Math.round(width / 2), h(width / 2))} ${Math.round(width / 2)}w, ${photoUrl(photo.src, width, h(width))} ${width}w, ${photoUrl(photo.src, width * 2, h(width * 2))} ${width * 2}w`}
                    sizes={sizes}
                    alt={photo.alt}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={() => setFailed(true)}
                    className={cn('absolute inset-0 size-full object-cover', imgClassName)}
                />
            )}
        </div>
    );
}
