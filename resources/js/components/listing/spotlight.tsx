import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { photoUrl } from '@/lib/format';
import type { Photo } from '@/types';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useEffect, useState } from 'react';

/**
 * The photos full screen, on black, each shown whole. Arrows, the arrow keys and a swipe
 * move between them; Escape or the close button leaves.
 */
export function Spotlight({ photos, start, open, onOpenChange }: { photos: Photo[]; start: number; open: boolean; onOpenChange: (open: boolean) => void }) {
    const [api, setApi] = useState<CarouselApi>();
    const [index, setIndex] = useState(start);
    useEffect(() => {
        if (!api) return;
        api.scrollTo(start, true);
        const select = () => setIndex(api.selectedScrollSnap());
        select();
        api.on('select', select);
        return () => {
            api.off('select', select);
        };
    }, [api, start]);
    const photo = photos[index];
    const many = photos.length > 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="h-dvh w-screen max-w-none gap-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
                onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') api?.scrollPrev();
                    if (e.key === 'ArrowRight') api?.scrollNext();
                }}
            >
                <DialogTitle className="sr-only">Photos</DialogTitle>
                <DialogDescription className="sr-only">Use the arrow keys or swipe to move between the photos.</DialogDescription>
                <Carousel setApi={setApi} opts={{ loop: true, startIndex: start }} className="h-dvh" aria-label="Photos, full screen">
                    <CarouselContent className="ml-0 h-dvh">
                        {photos.map((p) => (
                            <CarouselItem key={p.src} className="flex h-full items-center justify-center pl-0">
                                <img
                                    src={photoUrl(p.src, 1800)}
                                    srcSet={`${photoUrl(p.src, 1000)} 1000w, ${photoUrl(p.src, 1800)} 1800w, ${photoUrl(p.src, 2600)} 2600w`}
                                    sizes="100vw"
                                    alt={p.alt}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {many && (
                        <>
                            <CarouselPrevious variant="secondary" className="left-4" />
                            <CarouselNext variant="secondary" className="right-4" />
                        </>
                    )}
                </Carousel>
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-[linear-gradient(180deg,rgb(0_0_0/0.6),transparent)] p-4 pb-10">
                    <p className="text-sm text-white/80 tabular" aria-live="polite">
                        {many ? `${index + 1} / ${photos.length}` : ''}
                    </p>
                    <DialogClose asChild>
                        <Button variant="secondary" size="icon" className="pointer-events-auto" aria-label="Close">
                            <XMarkIcon />
                        </Button>
                    </DialogClose>
                </div>
                {photo && (
                    <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgb(0_0_0/0.6),transparent)] p-4 pt-10 text-center text-sm text-white/80">
                        {photo.alt}. Photo: {photo.credit}, Unsplash
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
