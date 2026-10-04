import { Container } from '@/components/container';
import { DAY_NAMES, tsh } from '@/lib/format';
import { listingUrl } from '@/lib/kinds';
import { priceFrom, type Signals } from '@/lib/signals';
import type { Listing } from '@/types';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';

interface Row {
    sw: string;
    en: string;
    answer: string;
    proof?: string;
    href?: string;
}

/**
 * The turn: the three questions every group-chat plan stalls on, set large in Swahili.
 * Each answer quotes whichever live listing shows it best right now; when none fits,
 * the answer stands on its own.
 */
export function Turn({ event, venue, venueSignals }: { event?: Listing; venue?: Listing; venueSignals?: Signals }) {
    const rows: Row[] = [
        {
            sw: 'Bei gani?',
            en: 'How much is it?',
            answer: 'Every listing shows its prices in shillings before you choose anything.',
            ...(event && {
                proof: event.event ? `${event.title}: ${event.event.tiers.map((t) => `${t.name} ${tsh(t.price)}`).join(', ')}.` : `${event.title}: from ${tsh(priceFrom(event))}.`,
                href: listingUrl(event),
            }),
        },
        {
            sw: 'Kuna watu?',
            en: 'Will it be busy?',
            answer: 'Every place shows when it usually fills up, worked out from real check-ins at the door.',
            ...(venue &&
                venueSignals &&
                venueSignals.checkIns > 0 && {
                    proof: `${venue.title}: ${venueSignals.peakDay !== null ? `busiest on ${DAY_NAMES[venueSignals.peakDay]}s` : 'steady through the week'}, from ${venueSignals.checkIns} check-ins.`,
                    href: listingUrl(venue),
                }),
        },
        {
            sw: 'Tiketi wapi?',
            en: 'Where do I get a ticket?',
            answer: 'Right there. Pay online and the QR code arrives straight away.',
            proof: 'Mobile money or a bank card. A declined payment takes nothing.',
        },
    ];

    return (
        <section data-tone="light" className="bg-white py-24 text-navy-900 md:py-32">
            <Container className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
                <div className="lg:sticky lg:top-32 lg:self-start">
                    <h2 data-reveal-lines className="max-w-[12ch] font-display text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1]">
                        Then come the same three questions.
                    </h2>
                    <p className="mt-6 max-w-[36ch] text-lg text-gray-600">Someone forwards a poster. In the chat nobody is sure of the answers until they reach the gate.</p>
                </div>
                <ol className="divide-y divide-gray-200 border-y border-gray-200">
                    {rows.map((r) => (
                        <li key={r.sw} className="grid gap-4 py-10 md:grid-cols-[1fr_1.1fr] md:gap-10 md:py-12">
                            <div>
                                <p lang="sw" className="font-display text-5xl leading-[1.05] md:text-6xl">
                                    {r.sw}
                                </p>
                                <p className="mt-3 text-gray-600">“{r.en}”</p>
                            </div>
                            <div className="space-y-3">
                                <p className="text-lg font-semibold">{r.answer}</p>
                                {r.proof && <p className="text-gray-600">{r.proof}</p>}
                                {r.href && (
                                    <Link href={r.href} className="inline-flex items-center gap-1.5 rounded-sm font-semibold text-navy-900 underline decoration-peri-300 decoration-2 underline-offset-4">
                                        See the listing
                                        <ArrowRightIcon className="size-4" aria-hidden="true" />
                                    </Link>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            </Container>
        </section>
    );
}
