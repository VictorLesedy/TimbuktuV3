import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, initials, timeAgo } from '@/lib/format';
import { KIND_INFO } from '@/lib/kinds';
import type { Signals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import { useApp, useCurrentFan } from '@/store/app-store';
import type { Host, Listing, Review } from '@/types';
import { CheckBadgeIcon, HeartIcon, MapPinIcon, ShareIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeSolid, HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { toast } from 'sonner';
import { BookingBox } from './booking-box';
import { Photo } from './photo';
import { SignalsPanel } from './signals-panel';

function Gallery({ listing }: { listing: Listing }) {
    const [index, setIndex] = useState(0);
    const photos = listing.photos;
    const current = photos[index] ?? photos[0]!;
    return (
        <div className="space-y-3">
            <Photo photo={current} width={1200} ratio={16 / 10} eager className="rounded-2xl" sizes="(min-width: 1024px) 60vw, 100vw" />
            {photos.length > 1 && (
                <div className="flex gap-2" role="list" aria-label="Photos">
                    {photos.map((p, i) => (
                        <button
                            key={p.src}
                            type="button"
                            role="listitem"
                            onClick={() => setIndex(i)}
                            aria-label={`Show photo ${i + 1}: ${p.alt}`}
                            aria-current={i === index}
                            className={cn('w-24 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-background', i === index ? 'ring-primary' : 'ring-transparent opacity-80 hover:opacity-100')}
                        >
                            <Photo photo={p} width={200} ratio={4 / 3} sizes="96px" />
                        </button>
                    ))}
                </div>
            )}
            <p className="text-xs text-muted-foreground">Photo: {current.credit}, Unsplash</p>
        </div>
    );
}

function Stars({ n }: { n: number }) {
    return (
        <span className="flex" aria-label={`${n} out of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon key={i} className={cn('size-4', i <= n ? 'text-primary' : 'text-muted')} aria-hidden="true" />
            ))}
        </span>
    );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
    const fans = useApp((s) => s.fans);
    const [all, setAll] = useState(false);
    const shown = all ? reviews : reviews.slice(0, 4);
    if (!reviews.length) return <p className="text-muted-foreground">No reviews yet. Guests can review after they are checked in at the door.</p>;
    return (
        <div className="space-y-6">
            <ul className="grid gap-6 sm:grid-cols-2">
                {shown.map((r) => {
                    const name = fans.find((f) => f.id === r.fanId)?.name ?? 'Guest';
                    return (
                        <li key={r.id} className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Avatar className="size-9">
                                    <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold">
                                        {name.split(' ')[0]} {name.split(' ')[1]?.[0]}.
                                    </p>
                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <CheckBadgeSolid className="size-3.5 text-live" aria-hidden="true" />
                                        Verified guest · {timeAgo(r.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <Stars n={r.rating} />
                            <p className="text-sm">{r.text}</p>
                        </li>
                    );
                })}
            </ul>
            {reviews.length > 4 && (
                <Button variant="outline" onClick={() => setAll((v) => !v)}>
                    {all ? 'Show fewer' : `Show all ${reviews.length} reviews`}
                </Button>
            )}
        </div>
    );
}

export function SaveShare({ listing }: { listing: Listing }) {
    const saved = useApp((s) => s.saves.some((v) => v.listingId === listing.id && v.fanId === s.session.fanId));
    const signedIn = useApp((s) => s.session.signedIn);
    const toggleSave = useApp((s) => s.toggleSave);
    const recordShare = useApp((s) => s.recordShare);
    const fan = useCurrentFan();

    const share = async () => {
        const url = new URL(window.location.href);
        if (signedIn && fan.level === 'ambassador') url.searchParams.set('ref', fan.referralCode);
        const text = `${listing.title} on Timbuktu`;
        try {
            if (navigator.share) await navigator.share({ title: text, url: url.toString() });
            else {
                await navigator.clipboard.writeText(url.toString());
                toast.success('Link copied', { description: fan.level === 'ambassador' && signedIn ? 'It carries your ambassador code.' : 'Paste it in WhatsApp.' });
            }
            if (signedIn) recordShare(listing.id);
        } catch {
            // The fan closed the share sheet.
        }
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                aria-pressed={saved}
                onClick={() => {
                    if (!signedIn) return toast('Sign up to save places', { action: { label: 'Sign up', onClick: () => (window.location.href = '/join') } });
                    toggleSave(listing.id);
                    toast.success(saved ? 'Removed from saved' : 'Saved', { description: saved ? undefined : 'Find it under Saved in your profile.' });
                }}
            >
                {saved ? <HeartSolid className="text-primary" /> : <HeartIcon />}
                {saved ? 'Saved' : 'Save'}
            </Button>
            <Button variant="outline" onClick={share}>
                <ShareIcon />
                Share
            </Button>
        </div>
    );
}

/** Everything a fan needs to decide, with the booking box kept in view while scrolling. */
export function ListingDetail({ listing, host, signals, reviews, preview }: { listing: Listing; host: Host; signals: Signals; reviews: Review[]; preview?: boolean }) {
    const kind = KIND_INFO[listing.kind];
    return (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-12">
            <div className="min-w-0 space-y-10">
                <div className="space-y-4">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <kind.icon className="size-4" aria-hidden="true" />
                        {kind.label} · {listing.category}
                    </p>
                    <h1 className="font-display text-3xl leading-tight md:text-5xl">{listing.title}</h1>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPinIcon className="size-5" aria-hidden="true" />
                            {listing.area}, {listing.city}
                        </p>
                        {!preview && <SaveShare listing={listing} />}
                    </div>
                </div>
                <Gallery listing={listing} />
                <section className="space-y-3">
                    <h2 className="text-xl font-semibold">About</h2>
                    <p className="text-lg">{listing.summary}</p>
                    <p className="max-w-prose text-muted-foreground">{listing.description}</p>
                    {listing.professional && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {listing.professional.offers.map((o) => (
                                <Badge key={o} variant="outline" className="h-7 px-3">
                                    {o}
                                </Badge>
                            ))}
                        </div>
                    )}
                </section>
                <section className="flex items-start gap-4 rounded-2xl border p-5">
                    <Avatar className="size-12">
                        <AvatarFallback className="bg-secondary font-semibold">{initials(host.name)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h2 className="flex items-center gap-1.5 font-semibold">
                            Hosted by {host.name}
                            {host.verified && <CheckBadgeIcon className="size-5 text-live" aria-label="Verified by Timbuktu" />}
                        </h2>
                        <p className="text-sm text-muted-foreground">{host.bio}</p>
                        <p className="text-sm text-muted-foreground">On Timbuktu since {formatDate(host.joinedAt)}</p>
                    </div>
                </section>
                <section className="space-y-5">
                    <h2 className="text-xl font-semibold">Live signals</h2>
                    <div className="rounded-2xl border p-5 md:p-6">
                        <SignalsPanel signals={signals} />
                    </div>
                </section>
                <section className="space-y-5">
                    <h2 className="text-xl font-semibold">Reviews from verified guests</h2>
                    <Reviews reviews={reviews} />
                </section>
            </div>
            <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Booking">
                <div className="rounded-2xl bg-card p-5 shadow-float ring-1 ring-foreground/10 md:p-6">
                    <h2 className="mb-4 text-lg font-semibold">{kind.verb}</h2>
                    {preview ? (
                        <div className="pointer-events-none opacity-90" aria-hidden="true">
                            <BookingBox listing={listing} signals={signals} />
                        </div>
                    ) : (
                        <BookingBox listing={listing} signals={signals} />
                    )}
                </div>
            </aside>
        </div>
    );
}
