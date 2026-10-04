import type { Kind, Listing } from '@/types';
import { BriefcaseIcon, BuildingStorefrontIcon, ClockIcon, TicketIcon } from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export const KIND_INFO: Record<Kind, { label: string; plural: string; icon: Icon; verb: string; how: string }> = {
    event: { label: 'Event', plural: 'Events', icon: TicketIcon, verb: 'Buy tickets', how: 'Buy tickets by tier, such as early bird, general or VIP.' },
    venue: { label: 'Venue', plural: 'Venues', icon: BuildingStorefrontIcon, verb: 'Reserve', how: 'Reserve entry, a table or a package, with a deposit.' },
    service: { label: 'Service', plural: 'Services', icon: ClockIcon, verb: 'Book a time', how: 'Book a time slot for a group, such as a tour or a class.' },
    professional: { label: 'Professional', plural: 'Professionals', icon: BriefcaseIcon, verb: 'Request a quote', how: 'Send a hire request, get a quote, accept and pay.' },
};

export const listingUrl = (l: Pick<Listing, 'slug'>) => `/listings/${l.slug}`;
