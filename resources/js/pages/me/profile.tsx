import { EmptyState } from '@/components/empty-state';
import { QuickRegister } from '@/components/fan/quick-register';
import { Ticket } from '@/components/fan/ticket';
import { ListingCard } from '@/components/listing/listing-card';
import { Photo } from '@/components/listing/photo';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DAY, formatDate, formatDateLong, formatDateTime, initials, timeAgo, tsh } from '@/lib/format';
import { listingUrl } from '@/lib/kinds';
import { useQuery, useSetQuery } from '@/lib/url-state';
import { cn } from '@/lib/utils';
import { useApp, useCurrentFan } from '@/store/app-store';
import type { HireRequest, Level, Listing, Order } from '@/types';
import {
    BookmarkIcon,
    CalendarDaysIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ClockIcon,
    HeartIcon,
    MegaphoneIcon,
    ShareIcon,
    StarIcon,
    TicketIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/20/solid';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const LEVELS: { id: Level; name: string; note: string }[] = [
    { id: 'explorer', name: 'Explorer', note: 'Browse and save' },
    { id: 'member', name: 'Member', note: 'Book, review and collect tickets' },
    { id: 'ambassador', name: 'Ambassador', note: 'Earn from sales your link brings in' },
];

function LevelTrack({ level, attended, reviews, shares }: { level: Level; attended: number; reviews: number; shares: number }) {
    const index = LEVELS.findIndex((l) => l.id === level);
    const ready = attended >= 3 && reviews >= 1;
    return (
        <div className="space-y-4 rounded-2xl border p-5">
            <ol className="grid grid-cols-3 gap-2">
                {LEVELS.map((l, i) => (
                    <li key={l.id} className={cn('space-y-1 rounded-xl p-3', i === index ? 'bg-primary text-primary-foreground' : i < index ? 'bg-secondary' : 'border border-dashed')}>
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                            {i < index && <CheckCircleIcon className="size-4" aria-hidden="true" />}
                            {l.name}
                        </p>
                        <p className={cn('text-xs', i === index ? 'opacity-90' : 'text-muted-foreground')}>{l.note}</p>
                    </li>
                ))}
            </ol>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="font-display text-2xl tabular">{attended}</p>
                    <p className="text-xs text-muted-foreground">attended</p>
                </div>
                <div>
                    <p className="font-display text-2xl tabular">{reviews}</p>
                    <p className="text-xs text-muted-foreground">reviews</p>
                </div>
                <div>
                    <p className="font-display text-2xl tabular">{shares}</p>
                    <p className="text-xs text-muted-foreground">shares</p>
                </div>
            </div>
            {level === 'member' && (
                <div className="space-y-2">
                    <Progress value={Math.min(100, ((Math.min(attended, 3) + Math.min(reviews, 1)) / 4) * 100)} aria-label="Progress to ambassador" />
                    <p className="text-sm text-muted-foreground">
                        {ready ? 'You can become an ambassador.' : 'Attend three times and leave one review to become an ambassador.'}{' '}
                        <Link href="/me/ambassador" className="font-medium text-foreground underline underline-offset-4">
                            About the programme
                        </Link>
                    </p>
                </div>
            )}
        </div>
    );
}

function ReviewDialog({ order, listing }: { order: Order; listing: Listing }) {
    const addReview = useApp((s) => s.addReview);
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const submit = () => {
        if (!rating) return setError('Choose a star rating.');
        if (text.trim().length < 10) return setError('Write a sentence about your visit.');
        addReview(order.id, rating, text.trim());
        setOpen(false);
        toast.success('Review posted', { description: 'It shows on the listing with a verified guest mark.' });
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <StarIcon />
                    Write a review
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>How was {listing.title}?</DialogTitle>
                    <DialogDescription>You were checked in on {formatDate(order.checkedInAt!)}, so your review counts as verified.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="rounded-md p-1">
                                <StarSolid className={cn('size-8', n <= rating ? 'text-primary' : 'text-muted')} />
                            </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="review-text">Your review</Label>
                        <Textarea id="review-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What should the next guest know?" />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button onClick={submit}>Post review</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const HIRE_STEPS: { status: HireRequest['status'][]; label: string }[] = [
    { status: ['requested', 'quoted', 'paid'], label: 'Request' },
    { status: ['quoted', 'paid'], label: 'Quote' },
    { status: ['paid'], label: 'Accept and pay' },
];

function HireCard({ req, listing }: { req: HireRequest; listing: Listing }) {
    const declineHire = useApp((s) => s.declineHire);
    const expired = req.status === 'quoted' && req.quote && new Date(req.quote.expiresAt).getTime() < Date.now();
    return (
        <article className="space-y-4 rounded-2xl border p-5">
            <div className="flex items-start gap-4">
                <Photo photo={listing.photos[0]!} width={160} ratio={1} className="size-16 shrink-0 rounded-xl" sizes="64px" />
                <div className="min-w-0 flex-1">
                    <Link href={listingUrl(listing)} className="font-semibold hover:underline">
                        {listing.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        {formatDateLong(req.date)} · {req.location} · {req.hours} hours
                    </p>
                    <p className="text-sm text-muted-foreground">Your budget {tsh(req.budget)}</p>
                </div>
                <Badge variant={req.status === 'declined' ? 'destructive' : req.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                    {req.status === 'paid' ? 'Booked' : expired ? 'Expired' : req.status}
                </Badge>
            </div>
            {req.status !== 'declined' && (
                <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
                    {HIRE_STEPS.map((s) => {
                        const done = s.status.includes(req.status);
                        return (
                            <li key={s.label} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm', done ? 'bg-primary/10 font-medium' : 'bg-muted text-muted-foreground')}>
                                {done ? <CheckCircleIcon className="size-4 text-primary" aria-hidden="true" /> : <ClockIcon className="size-4" aria-hidden="true" />}
                                {s.label}
                            </li>
                        );
                    })}
                </ol>
            )}
            {req.quote && req.status === 'quoted' && (
                <div className="space-y-3 rounded-xl bg-secondary p-4">
                    <div className="flex items-baseline justify-between gap-3">
                        <p className="font-semibold">Quote</p>
                        <p className="font-display text-2xl tabular">{tsh(req.quote.price)}</p>
                    </div>
                    <p className="text-sm">{req.quote.terms}</p>
                    <p className="text-sm text-muted-foreground">{expired ? 'This quote has expired.' : `Valid until ${formatDateTime(req.quote.expiresAt)}`}</p>
                    {!expired && (
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => router.visit(`/checkout?hire=${req.id}`)}>Accept and pay</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline">Decline</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Decline this quote?</AlertDialogTitle>
                                        <AlertDialogDescription>{listing.title} will be told. You can send a new request later.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => declineHire(req.id, 'Declined by the fan')}>Decline quote</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
            )}
            {req.status === 'declined' && req.declineReason && <p className="text-sm text-muted-foreground">Reason: {req.declineReason}</p>}
            <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">Timeline</summary>
                <ol className="mt-3 space-y-2 border-l pl-4">
                    {req.timeline.map((t, i) => (
                        <li key={i}>
                            <span className="font-medium">{t.label}</span> <span className="text-muted-foreground">· {formatDateTime(t.at)}</span>
                        </li>
                    ))}
                </ol>
            </details>
        </article>
    );
}

export default function Profile() {
    const query = useQuery();
    const setQuery = useSetQuery();
    const tab = query.get('tab') ?? 'tickets';
    const signedIn = useApp((s) => s.session.signedIn);
    const fan = useCurrentFan();
    const listings = useApp((s) => s.listings);
    const orders = useApp((s) => s.orders);
    const reviews = useApp((s) => s.reviews);
    const saves = useApp((s) => s.saves);
    const shares = useApp((s) => s.shares);
    const hireRequests = useApp((s) => s.hireRequests);

    const data = useMemo(() => {
        const byId = new Map(listings.map((l) => [l.id, l]));
        const mine = orders.filter((o) => o.fanId === fan.id);
        const now = Date.now();
        const tickets = mine.filter((o) => !o.hireRequestId);
        const upcoming = tickets.filter((o) => new Date(o.visitAt).getTime() > now - 6 * 3600_000 && !o.checkedInAt).sort((a, b) => a.visitAt.localeCompare(b.visitAt));
        const past = tickets.filter((o) => !upcoming.includes(o)).sort((a, b) => b.visitAt.localeCompare(a.visitAt));
        const myReviews = reviews.filter((r) => r.fanId === fan.id);
        const reviewed = new Set(myReviews.map((r) => r.orderId));
        const toReview = mine.filter((o) => o.checkedInAt && !reviewed.has(o.id) && now - new Date(o.checkedInAt).getTime() < 30 * DAY);
        const saved = saves.filter((s) => s.fanId === fan.id).map((s) => byId.get(s.listingId)).filter((l): l is Listing => Boolean(l && l.status === 'live'));
        const hires = hireRequests.filter((r) => r.fanId === fan.id).sort((a, b) => b.timeline[0]!.at.localeCompare(a.timeline[0]!.at));
        const myShares = shares.filter((s) => s.fanId === fan.id);
        const activity = [
            ...mine.map((o) => ({ at: o.createdAt, icon: TicketIcon, text: `Booked ${byId.get(o.listingId)?.title}` })),
            ...mine.filter((o) => o.checkedInAt).map((o) => ({ at: o.checkedInAt!, icon: CheckCircleIcon, text: `Checked in at ${byId.get(o.listingId)?.title}` })),
            ...myReviews.map((r) => ({ at: r.createdAt, icon: StarIcon, text: `Reviewed ${byId.get(r.listingId)?.title}` })),
            ...saves.filter((s) => s.fanId === fan.id).map((s) => ({ at: s.at, icon: HeartIcon, text: `Saved ${byId.get(s.listingId)?.title}` })),
            ...myShares.map((s) => ({ at: s.at, icon: ShareIcon, text: `Shared ${byId.get(s.listingId)?.title}` })),
            ...hires.map((r) => ({ at: r.timeline[0]!.at, icon: ChatBubbleLeftRightIcon, text: `Asked ${byId.get(r.listingId)?.title} for a quote` })),
        ]
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 30);
        return { byId, upcoming, past, myReviews, toReview, saved, hires, activity, attended: mine.filter((o) => o.checkedInAt).length, shareCount: myShares.length };
    }, [listings, orders, reviews, saves, shares, hireRequests, fan.id]);

    if (!signedIn) {
        return (
            <div className="mx-auto max-w-md space-y-6 px-4 py-16">
                <Head title="Your profile" />
                <div className="space-y-2 text-center">
                    <UserCircleIcon className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
                    <h1 className="font-display text-3xl">Your tickets live here</h1>
                    <p className="text-muted-foreground">Create a free account to book, keep your QR tickets, save places and review where you went.</p>
                </div>
                <div className="rounded-2xl border p-5">
                    <QuickRegister submitLabel="Create account" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                    Want to pick your interests too?{' '}
                    <Link href="/join" className="font-medium text-foreground underline underline-offset-4">
                        Use the full sign-up
                    </Link>
                </p>
            </div>
        );
    }

    const { byId } = data;
    return (
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6 md:py-12">
            <Head title="Your profile" />
            <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-start">
                <div className="flex items-center gap-4">
                    <Avatar className="size-16">
                        <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">{initials(fan.name)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h1 className="font-display text-2xl md:text-3xl">{fan.name}</h1>
                        <p className="text-muted-foreground">
                            {fan.city} · {fan.phone}
                        </p>
                        {fan.level === 'ambassador' && (
                            <Button asChild size="sm" variant="outline" className="mt-1">
                                <Link href="/me/ambassador">
                                    <MegaphoneIcon />
                                    Ambassador dashboard
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
                <LevelTrack level={fan.level} attended={data.attended} reviews={data.myReviews.length} shares={data.shareCount} />
            </div>

            <Tabs value={tab} onValueChange={(v) => setQuery({ tab: v === 'tickets' ? null : v })} className="gap-6">
                <TabsList className="scrollbar-none h-auto w-full justify-start overflow-x-auto">
                    <TabsTrigger value="tickets" className="h-9 flex-none px-4">
                        Tickets {data.upcoming.length > 0 && <Badge className="ml-1 tabular">{data.upcoming.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="hire" className="h-9 flex-none px-4">
                        Hire requests
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="h-9 flex-none px-4">
                        Reviews {data.toReview.length > 0 && <Badge className="ml-1 tabular">{data.toReview.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="h-9 flex-none px-4">
                        Saved
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="h-9 flex-none px-4">
                        Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tickets" className="space-y-8">
                    {data.upcoming.length === 0 ? (
                        <EmptyState icon={TicketIcon} title="No upcoming tickets" body="Tickets and bookings you pay for appear here with their QR codes." action={<Button asChild><Link href="/explore">See what's on</Link></Button>} />
                    ) : (
                        <ul className="grid gap-6 sm:grid-cols-2">
                            {data.upcoming.map((o) => (
                                <li key={o.id}>
                                    <Ticket order={o} listing={byId.get(o.listingId)!} />
                                </li>
                            ))}
                        </ul>
                    )}
                    {data.past.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="font-semibold">Past</h2>
                            <ul className="grid gap-3 sm:grid-cols-2">
                                {data.past.map((o) => (
                                    <li key={o.id}>
                                        <Ticket order={o} listing={byId.get(o.listingId)!} compact className="opacity-80" />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </TabsContent>

                <TabsContent value="hire" className="space-y-4">
                    {data.hires.length === 0 ? (
                        <EmptyState icon={ChatBubbleLeftRightIcon} title="No hire requests" body="Ask a DJ, band or photographer for a quote from their listing." action={<Button asChild><Link href="/explore?kind=professional">Find talent</Link></Button>} />
                    ) : (
                        data.hires.map((r) => <HireCard key={r.id} req={r} listing={byId.get(r.listingId)!} />)
                    )}
                </TabsContent>

                <TabsContent value="reviews" className="space-y-8">
                    {data.toReview.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="font-semibold">Waiting for your review</h2>
                            <ul className="space-y-3">
                                {data.toReview.map((o) => {
                                    const l = byId.get(o.listingId)!;
                                    return (
                                        <li key={o.id} className="flex items-center gap-4 rounded-2xl border p-4">
                                            <Photo photo={l.photos[0]!} width={160} ratio={1} className="size-14 shrink-0 rounded-lg" sizes="56px" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold">{l.title}</p>
                                                <p className="text-sm text-muted-foreground">Checked in {timeAgo(o.checkedInAt!)}</p>
                                            </div>
                                            <ReviewDialog order={o} listing={l} />
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}
                    {data.myReviews.length === 0 ? (
                        <EmptyState icon={StarIcon} title="No reviews yet" body="After you are checked in at the door, you can review the place here." />
                    ) : (
                        <ul className="space-y-3">
                            {data.myReviews.map((r) => (
                                <li key={r.id} className="space-y-2 rounded-2xl border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <Link href={listingUrl(byId.get(r.listingId)!)} className="font-semibold hover:underline">
                                            {byId.get(r.listingId)?.title}
                                        </Link>
                                        <span className="flex" aria-label={`${r.rating} out of 5`}>
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <StarSolid key={n} className={cn('size-4', n <= r.rating ? 'text-primary' : 'text-muted')} aria-hidden="true" />
                                            ))}
                                        </span>
                                    </div>
                                    <p className="text-sm">{r.text}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </TabsContent>

                <TabsContent value="saved">
                    {data.saved.length === 0 ? (
                        <EmptyState icon={BookmarkIcon} title="Nothing saved" body="Tap Save on a listing to keep it here." />
                    ) : (
                        <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                            {data.saved.map((l) => (
                                <li key={l.id}>
                                    <ListingCard listing={l} />
                                </li>
                            ))}
                        </ul>
                    )}
                </TabsContent>

                <TabsContent value="activity">
                    {data.activity.length === 0 ? (
                        <EmptyState icon={CalendarDaysIcon} title="No activity yet" />
                    ) : (
                        <ol className="space-y-1">
                            {data.activity.map((a, i) => (
                                <li key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-secondary/60">
                                    <a.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{a.text}</span>
                                    <span className="shrink-0 text-sm text-muted-foreground">{timeAgo(a.at)}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
