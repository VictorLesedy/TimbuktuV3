export type Kind = 'event' | 'venue' | 'service' | 'professional';

export const KINDS: Kind[] = ['event', 'venue', 'service', 'professional'];

export type City = 'Dar es Salaam' | 'Arusha' | 'Zanzibar' | 'Dodoma';

export const CITIES: City[] = ['Dar es Salaam', 'Arusha', 'Zanzibar', 'Dodoma'];

export type Category =
    | 'Concert'
    | 'Match day'
    | 'Festival'
    | 'Family day'
    | 'Cinema'
    | 'Arcade'
    | 'Gallery'
    | 'Tour'
    | 'Class'
    | 'Nightlife'
    | 'Comedy'
    | 'Talent';

export type ListingStatus = 'pending' | 'changes_requested' | 'live' | 'paused' | 'rejected';

export interface Photo {
    /** Unsplash path, e.g. photo-1635161517754-2d596cf8a540 */
    src: string;
    alt: string;
    credit: string;
}

export interface Tier {
    id: string;
    name: string;
    price: number;
    includes: string;
    capacity: number;
}

export interface VenueOption {
    id: string;
    name: string;
    price: number;
    deposit: number;
    includes: string;
    perDay: number;
}

export interface EventDetails {
    startsAt: string;
    endsAt: string;
    place: string;
    tiers: Tier[];
}

export interface VenueDetails {
    opens: string;
    closes: string;
    /** 0 = Sunday */
    closedOn: number[];
    options: VenueOption[];
}

export interface ServiceDetails {
    durationMins: number;
    /** 0 = Sunday */
    days: number[];
    times: string[];
    capacity: number;
    pricePerPerson: number;
    maxGroup: number;
    meetingPoint: string;
}

export interface ProfessionalDetails {
    rateFrom: number;
    rateUnit: string;
    offers: string[];
    unavailable: string[];
    responseHours: number;
}

export interface Listing {
    id: string;
    slug: string;
    kind: Kind;
    category: Category;
    title: string;
    summary: string;
    description: string;
    city: City;
    area: string;
    /** Distance from the city centre in km, used for "nearest". */
    distanceKm: number;
    hostId: string;
    photos: Photo[];
    status: ListingStatus;
    featured: boolean;
    createdAt: string;
    reviewNote?: string;
    event?: EventDetails;
    venue?: VenueDetails;
    service?: ServiceDetails;
    professional?: ProfessionalDetails;
}

export interface Host {
    id: string;
    name: string;
    city: City;
    bio: string;
    verified: boolean;
    joinedAt: string;
    phone: string;
    profileStatus: 'pending' | 'approved' | 'changes_requested' | 'rejected';
    reviewNote?: string;
}

export type Level = 'explorer' | 'member' | 'ambassador';

export type Interest = 'Music and nightlife' | 'Sport and fitness' | 'Days out' | 'Arts and culture';

export const INTERESTS: Interest[] = ['Music and nightlife', 'Sport and fitness', 'Days out', 'Arts and culture'];

export type Network = 'M-Pesa' | 'Mixx by Yas' | 'Airtel Money' | 'HaloPesa';

export const NETWORKS: Network[] = ['M-Pesa', 'Mixx by Yas', 'Airtel Money', 'HaloPesa'];

export type GuestGroup = 'Solo' | 'Couples' | 'Friends' | 'Families';

export const GUEST_GROUPS: GuestGroup[] = ['Solo', 'Couples', 'Friends', 'Families'];

export interface Fan {
    id: string;
    name: string;
    phone: string;
    city: City;
    level: Level;
    interests: Interest[];
    artists: string[];
    referralCode: string;
    joinedAt: string;
}

export interface OrderLine {
    label: string;
    qty: number;
    unitPrice: number;
}

/** How one paid order's money is shared. Recorded at payment time, so later rate changes don't rewrite history. */
export interface Split {
    gross: number;
    commission: number;
    entertainer: number;
    ambassador: number;
    government: number;
    partner: number;
    timbuktu: number;
}

export interface Order {
    id: string;
    code: string;
    listingId: string;
    fanId: string;
    lines: OrderLine[];
    guests: number;
    group: GuestGroup;
    subtotal: number;
    discount: number;
    total: number;
    /** For venues: paid now; the rest is settled on the day. */
    dueOnDay: number;
    promo?: string;
    network: Network;
    phone: string;
    createdAt: string;
    /** The date (and time) the fan goes. */
    visitAt: string;
    referredBy?: string;
    hireRequestId?: string;
    checkedInAt?: string;
    split: Split;
}

export interface Review {
    id: string;
    listingId: string;
    orderId: string;
    fanId: string;
    rating: number;
    text: string;
    createdAt: string;
}

export interface Save {
    listingId: string;
    fanId: string;
    at: string;
}

export interface Share {
    listingId: string;
    fanId: string;
    at: string;
}

export type HireStatus = 'requested' | 'quoted' | 'paid' | 'declined';

export interface HireRequest {
    id: string;
    listingId: string;
    fanId: string;
    date: string;
    location: string;
    hours: number;
    budget: number;
    message: string;
    status: HireStatus;
    quote?: { price: number; terms: string; expiresAt: string };
    declineReason?: string;
    orderId?: string;
    timeline: { at: string; label: string }[];
}

export interface Payout {
    id: string;
    party: 'host' | 'ambassador';
    ownerId: string;
    amount: number;
    network: Network;
    phone: string;
    at: string;
}

export interface Settings {
    commission: Record<Kind, number>;
    governmentShare: number;
    partnerShare: number;
    ambassadorShare: number;
    crowdMinBookings: number;
    showCrowd: boolean;
    signupTiming: 'before' | 'checkout';
}

export type Role = 'fan' | 'studio' | 'admin';
