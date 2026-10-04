import type { Kind, Settings, Split } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
    commission: { event: 0.1, venue: 0.12, service: 0.12, professional: 0.15 },
    governmentShare: 0.2,
    partnerShare: 0.15,
    ambassadorShare: 0.05,
    crowdMinBookings: 30,
    showCrowd: true,
    signupTiming: 'checkout',
};

/**
 * Splits one paid amount. The entertainer gets the price minus commission. From the
 * commission: the ambassador's share of the sale (if a link brought the fan in), then
 * the government's and partner's shares of the commission, and Timbuktu keeps the rest.
 * Every part is whole shillings and the parts always add up to the gross.
 */
export function splitOrder(gross: number, kind: Kind, settings: Settings, referred: boolean): Split {
    const commission = Math.round(gross * settings.commission[kind]);
    const entertainer = gross - commission;
    const ambassador = referred ? Math.min(commission, Math.round(gross * settings.ambassadorShare)) : 0;
    const government = Math.round(commission * settings.governmentShare);
    const partner = Math.round(commission * settings.partnerShare);
    const timbuktu = commission - ambassador - government - partner;
    return { gross, commission, entertainer, ambassador, government, partner, timbuktu };
}

export function sumSplits(splits: Split[]): Split {
    return splits.reduce(
        (a, s) => ({
            gross: a.gross + s.gross,
            commission: a.commission + s.commission,
            entertainer: a.entertainer + s.entertainer,
            ambassador: a.ambassador + s.ambassador,
            government: a.government + s.government,
            partner: a.partner + s.partner,
            timbuktu: a.timbuktu + s.timbuktu,
        }),
        { gross: 0, commission: 0, entertainer: 0, ambassador: 0, government: 0, partner: 0, timbuktu: 0 },
    );
}

export const PROMOS: Record<string, number> = { KARIBU10: 0.1, WIKIENDI15: 0.15 };
