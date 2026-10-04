import type { HireRequest, Listing, Order, OrderLine } from '@/types';
import { isoDay } from './format';

/** Paid orders already holding a place, so what is left can be shown and re-checked at payment. */
export function eventSold(orders: Order[], l: Listing, tierName: string): number {
    const at = l.event?.startsAt;
    return orders.filter((o) => o.listingId === l.id && o.visitAt === at).reduce((s, o) => s + o.lines.filter((x) => x.label === tierName).reduce((a, x) => a + x.qty, 0), 0);
}

export function venueBooked(orders: Order[], l: Listing, optionName: string, day: string): number {
    return orders
        .filter((o) => o.listingId === l.id && isoDay(new Date(o.visitAt)) === day)
        .reduce((s, o) => s + o.lines.filter((x) => x.label === optionName).reduce((a, x) => a + x.qty, 0), 0);
}

export function serviceBooked(orders: Order[], l: Listing, day: string, time: string): number {
    return orders.filter((o) => o.listingId === l.id && isoDay(new Date(o.visitAt)) === day && new Date(o.visitAt).toTimeString().slice(0, 5) === time).reduce((s, o) => s + o.guests, 0);
}

/** Dates a professional already has a paid booking on. */
export function proBookedDays(orders: Order[], l: Listing): Set<string> {
    return new Set(orders.filter((o) => o.listingId === l.id).map((o) => isoDay(new Date(o.visitAt))));
}

export interface Cart {
    listing: Listing;
    lines: OrderLine[];
    guests: number;
    subtotal: number;
    /** Paid now through Timbuktu. For venues this is the deposit. */
    payNow: number;
    dueOnDay: number;
    visitAt: string;
    /** How many places are left for this choice right now. */
    left: number;
    hire?: HireRequest;
    summary: string;
}

const at = (day: string, time: string) => new Date(`${day}T${time}:00`).toISOString();

/** Rebuilds the basket from the checkout link. Returns an error message when the link no longer makes sense. */
export function buildCart(params: URLSearchParams, listings: Listing[], orders: Order[], hireRequests: HireRequest[]): Cart | { error: string } {
    const hireId = params.get('hire');
    if (hireId) {
        const hire = hireRequests.find((r) => r.id === hireId);
        if (!hire || !hire.quote) return { error: 'This quote could not be found.' };
        if (hire.status === 'paid') return { error: 'This quote has already been paid.' };
        if (new Date(hire.quote.expiresAt).getTime() < Date.now()) return { error: 'This quote has expired. Ask for a new one from the listing page.' };
        const listing = listings.find((l) => l.id === hire.listingId)!;
        const price = hire.quote.price;
        return {
            listing,
            lines: [{ label: `Hire for ${hire.hours} hours`, qty: 1, unitPrice: price }],
            guests: 1,
            subtotal: price,
            payNow: price,
            dueOnDay: 0,
            visitAt: hire.date,
            left: 1,
            hire,
            summary: `${hire.location}, ${hire.hours} hours`,
        };
    }

    const listing = listings.find((l) => l.slug === params.get('listing'));
    if (!listing || listing.status !== 'live') return { error: 'This listing is not available to book.' };

    if (listing.event) {
        const tier = listing.event.tiers.find((t) => t.id === params.get('tier'));
        const qty = Math.max(1, Number(params.get('qty') ?? 1));
        if (!tier) return { error: 'Pick a ticket type on the listing page.' };
        const left = tier.capacity - eventSold(orders, listing, tier.name);
        const subtotal = tier.price * qty;
        return { listing, lines: [{ label: tier.name, qty, unitPrice: tier.price }], guests: qty, subtotal, payNow: subtotal, dueOnDay: 0, visitAt: listing.event.startsAt, left, summary: tier.includes };
    }

    if (listing.venue) {
        const option = listing.venue.options.find((o) => o.id === params.get('option'));
        const day = params.get('date') ?? '';
        const qty = Math.max(1, Number(params.get('qty') ?? 1));
        if (!option || !day) return { error: 'Pick a date and an option on the listing page.' };
        const left = option.perDay - venueBooked(orders, listing, option.name, day);
        const subtotal = option.price * qty;
        const payNow = option.deposit * qty;
        const guests = option.price === option.deposit ? qty : Number(params.get('guests') ?? 4);
        return { listing, lines: [{ label: option.name, qty, unitPrice: option.price }], guests, subtotal, payNow, dueOnDay: subtotal - payNow, visitAt: at(day, listing.venue.opens), left, summary: option.includes };
    }

    if (listing.service) {
        const day = params.get('date') ?? '';
        const time = params.get('time') ?? '';
        const guests = Math.max(1, Number(params.get('guests') ?? 1));
        if (!day || !listing.service.times.includes(time)) return { error: 'Pick a date and time on the listing page.' };
        const left = listing.service.capacity - serviceBooked(orders, listing, day, time);
        const subtotal = listing.service.pricePerPerson * guests;
        return {
            listing,
            lines: [{ label: 'Guests', qty: guests, unitPrice: listing.service.pricePerPerson }],
            guests,
            subtotal,
            payNow: subtotal,
            dueOnDay: 0,
            visitAt: at(day, time),
            left,
            summary: `Meet at ${listing.service.meetingPoint}`,
        };
    }

    return { error: 'Professionals are booked through a quote. Send a request from the listing page.' };
}

export function cartQty(cart: Cart): number {
    return cart.lines.reduce((s, l) => s + l.qty, 0);
}
