export const DAY = 86_400_000;
export const HOUR = 3_600_000;

const money = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 });

export function tsh(amount: number): string {
    return `TSh ${money.format(Math.round(amount))}`;
}

export function compact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    return money.format(n);
}

export function pct(n: number, digits = 0): string {
    return `${(n * 100).toFixed(digits)}%`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const dateLong = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export const formatDate = (iso: string | Date) => dateFmt.format(new Date(iso));
export const formatDateLong = (iso: string | Date) => dateLong.format(new Date(iso));
export const formatTime = (iso: string | Date) => timeFmt.format(new Date(iso));
export const formatDayMonth = (iso: string | Date | number) => dayMonth.format(new Date(iso));
export const formatDateTime = (iso: string | Date) => `${formatDate(iso)}, ${formatTime(iso)}`;

export function timeAgo(iso: string, now = Date.now()): string {
    const diff = now - new Date(iso).getTime();
    if (diff < HOUR) return `${Math.max(1, Math.round(diff / 60_000))} min ago`;
    if (diff < DAY) return `${Math.round(diff / HOUR)} h ago`;
    const days = Math.round(diff / DAY);
    return days === 1 ? 'yesterday' : `${days} days ago`;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** yyyy-mm-dd in local time. */
export function isoDay(d: Date | number | string): string {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function startOfDay(d: Date | number): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

/** Tanzanian mobile number as typed by a fan, normalised to +255 7XX XXX XXX. Returns null if it isn't one. */
export function normalisePhone(input: string): string | null {
    const digits = input.replace(/\D/g, '');
    let local = '';
    if (digits.startsWith('255') && digits.length === 12) local = digits.slice(3);
    else if (digits.startsWith('0') && digits.length === 10) local = digits.slice(1);
    else if (digits.length === 9) local = digits;
    if (!/^[67]\d{8}$/.test(local)) return null;
    return `+255 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function photoUrl(src: string, w: number, h?: number): string {
    const size = h ? `&h=${h}&fit=crop` : '';
    return `https://images.unsplash.com/${src}?w=${w}${size}&q=75&fm=webp&auto=format`;
}

export function initials(name: string): string {
    return name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}
