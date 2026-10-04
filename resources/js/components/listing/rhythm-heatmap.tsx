import { DAY_NAMES, DAY_SHORT } from '@/lib/format';
import { BANDS, type Signals } from '@/lib/signals';
import { cn } from '@/lib/utils';

// Monday first, as people plan a week.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Day by time-of-day heatmap of check-ins, with a text summary for screen readers. */
export function RhythmHeatmap({ signals, className }: { signals: Signals; className?: string }) {
    const cells = ORDER.flatMap((d) => BANDS.map((b, bi) => ({ d, b, v: signals.rhythm[d]![bi]! })));
    const top = [...cells].sort((a, b) => b.v - a.v).slice(0, 2).filter((c) => c.v > 0);
    const summary = top.length ? `Usually busiest on ${top.map((c) => `${DAY_NAMES[c.d]} ${c.b.toLowerCase()}`).join(' and ')}.` : 'Not enough check-ins yet.';

    return (
        <figure className={cn('space-y-3', className)}>
            <div aria-hidden="true" className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1 text-xs text-muted-foreground">
                <span />
                {ORDER.map((d) => (
                    <span key={d} className="text-center">
                        {DAY_SHORT[d]}
                    </span>
                ))}
                {BANDS.map((band, bi) => (
                    <div key={band} className="contents">
                        <span className="pr-2 leading-7">{band}</span>
                        {ORDER.map((d) => {
                            const v = signals.rhythm[d]![bi]!;
                            return (
                                <span
                                    key={d}
                                    title={`${DAY_NAMES[d]} ${band.toLowerCase()}`}
                                    className="h-7 rounded-md bg-primary"
                                    style={{ opacity: v === 0 ? 0.07 : 0.15 + v * 0.85 }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            <figcaption className="text-sm text-muted-foreground">
                {summary} Built from {signals.checkIns} check-ins over the last 12 weeks.
            </figcaption>
        </figure>
    );
}
