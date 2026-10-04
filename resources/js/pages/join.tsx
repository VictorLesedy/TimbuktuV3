import { DemoControls } from '@/components/shell/demo-controls';
import { Wordmark } from '@/components/shell/wordmark';
import { Photo } from '@/components/listing/photo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PHOTOS } from '@/data/photos';
import { normalisePhone, pct } from '@/lib/format';
import { useQuery } from '@/lib/url-state';
import { cn } from '@/lib/utils';
import { useApp } from '@/store/app-store';
import { CITIES, INTERESTS, type City, type Interest, type Level } from '@/types';
import { ArrowLeftIcon, CheckCircleIcon, MegaphoneIcon, MusicalNoteIcon, PaintBrushIcon, SparklesIcon, SunIcon, TicketIcon, TrophyIcon, BuildingStorefrontIcon, UserIcon } from '@heroicons/react/24/outline';
import { Head, Link, router } from '@inertiajs/react';
import { useState, type FormEvent, type ReactNode } from 'react';

const ARTISTS = ['Diamond Platnumz', 'Zuchu', 'Harmonize', 'Nandy', 'Rayvanny', 'Ali Kiba', 'Jux', 'Marioo', 'Mbosso', 'Lady Jaydee', 'Barnaba', 'Abigail Chams'];
const INTEREST_ICON: Record<Interest, typeof SunIcon> = {
    'Music and nightlife': MusicalNoteIcon,
    'Sport and fitness': TrophyIcon,
    'Days out': SunIcon,
    'Arts and culture': PaintBrushIcon,
};

function Choice({ value, title, body, icon: Icon }: { value: string; title: string; body: string; icon: typeof SunIcon }) {
    return (
        <Label className="flex cursor-pointer items-start gap-4 rounded-2xl border p-5 font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <RadioGroupItem value={value} className="sr-only" />
            <Icon className="size-7 shrink-0 text-primary" aria-hidden="true" />
            <span className="space-y-1">
                <span className="block text-lg font-semibold">{title}</span>
                <span className="block text-muted-foreground">{body}</span>
            </span>
        </Label>
    );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
    );
}

export default function Join() {
    const query = useQuery();
    const next = query.get('next');
    const ambassadorShare = useApp((s) => s.settings.ambassadorShare);
    const completeFanOnboarding = useApp((s) => s.completeFanOnboarding);
    const registerEntertainer = useApp((s) => s.registerEntertainer);

    const [path, setPath] = useState<'fan' | 'entertainer'>(query.get('as') === 'entertainer' ? 'entertainer' : 'fan');
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState<City>('Dar es Salaam');
    const [artists, setArtists] = useState<string[]>([]);
    const [interests, setInterests] = useState<Interest[]>([]);
    const [tier, setTier] = useState<Level>('member');
    const [business, setBusiness] = useState('');
    const [bio, setBio] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [done, setDone] = useState(false);

    const steps = path === 'fan' ? ['Fan or entertainer', 'About you', 'Your tastes'] : ['Fan or entertainer', 'About you', 'Your business'];

    const validateAbout = () => {
        const e: Record<string, string> = {};
        if (name.trim().split(/\s+/).length < 2) e.name = 'Enter your first and last name.';
        if (!normalisePhone(phone)) e.phone = 'Enter a Tanzanian mobile number, like 0754 123 456.';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const submit = (ev: FormEvent) => {
        ev.preventDefault();
        if (step === 0) return setStep(1);
        if (step === 1) {
            if (validateAbout()) setStep(2);
            return;
        }
        if (path === 'fan') {
            completeFanOnboarding({ name: name.trim(), phone: normalisePhone(phone)!, city, artists, interests, level: tier });
            router.visit(next && next.startsWith('/') ? next : tier === 'ambassador' ? '/me/ambassador' : '/');
            return;
        }
        const e: Record<string, string> = {};
        if (business.trim().length < 2) e.business = 'Enter the name fans will see.';
        if (bio.trim().length < 20) e.bio = 'Describe what you offer in a sentence or two.';
        setErrors(e);
        if (Object.keys(e).length) return;
        registerEntertainer({ name: business.trim(), phone: normalisePhone(phone)!, city, bio: bio.trim() });
        setDone(true);
    };

    return (
        <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
            <Head title="Sign up" />
            <div className="relative hidden lg:block">
                <Photo photo={path === 'fan' ? PHOTOS.celebration : PHOTOS.djConsole} width={1200} ratio={3 / 4} eager className="absolute inset-0 size-full" sizes="50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <p className="absolute right-8 bottom-8 left-8 font-display text-4xl leading-tight text-white">{path === 'fan' ? 'Every good time in Tanzania, in one app.' : 'Sell tickets, tables, tours and talent.'}</p>
            </div>
            <div className="flex flex-col px-4 py-6 md:px-10">
                <div className="flex items-center justify-between">
                    <Wordmark />
                    <Button asChild variant="ghost">
                        <Link href="/">Not now</Link>
                    </Button>
                </div>
                <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
                    {done ? (
                        <div className="space-y-5 text-center">
                            <CheckCircleIcon className="mx-auto size-12 text-live" aria-hidden="true" />
                            <h1 className="font-display text-3xl">Thanks, {business}</h1>
                            <p className="text-muted-foreground">Your profile is with the Timbuktu team for approval. You will get an SMS when it is approved, usually within a day. Then you can create listings.</p>
                            <Button asChild size="lg">
                                <Link href="/studio">Look around the studio demo</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={submit} noValidate className="space-y-8">
                            <div className="space-y-3">
                                <Progress value={((step + 1) / steps.length) * 100} aria-label={`Step ${step + 1} of ${steps.length}`} />
                                <p className="text-sm text-muted-foreground">
                                    Step {step + 1} of {steps.length}: {steps[step]}
                                </p>
                            </div>

                            {step === 0 && (
                                <div className="space-y-5">
                                    <h1 className="font-display text-3xl">Sign up in under a minute</h1>
                                    <RadioGroup value={path} onValueChange={(v) => setPath(v as typeof path)} className="gap-3">
                                        <Choice value="fan" icon={TicketIcon} title="I want to go out" body="Find what is on, book with mobile money and keep your tickets in one place." />
                                        <Choice value="entertainer" icon={BuildingStorefrontIcon} title="I run something people go to" body="Venues, promoters, tour operators, DJs, bands and photographers." />
                                    </RadioGroup>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-5">
                                    <h1 className="font-display text-3xl">About you</h1>
                                    <Field id="join-name" label="Full name" error={errors.name}>
                                        <Input id="join-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" aria-invalid={Boolean(errors.name)} autoFocus />
                                    </Field>
                                    <Field id="join-phone" label="Mobile number" error={errors.phone} hint="We send tickets and codes to this number.">
                                        <Input id="join-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0754 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" aria-invalid={Boolean(errors.phone)} />
                                    </Field>
                                    <Field id="join-city" label="City">
                                        <Select value={city} onValueChange={(v) => setCity(v as City)}>
                                            <SelectTrigger id="join-city" className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CITIES.map((c) => (
                                                    <SelectItem key={c} value={c}>
                                                        {c}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                            )}

                            {step === 2 && path === 'fan' && (
                                <div className="space-y-8">
                                    <h1 className="font-display text-3xl">What do you like?</h1>
                                    <div className="space-y-3">
                                        <p className="font-medium">Favourite artists</p>
                                        <ToggleGroup type="multiple" variant="outline" value={artists} onValueChange={setArtists} className="flex flex-wrap justify-start gap-2">
                                            {ARTISTS.map((a) => (
                                                <ToggleGroupItem key={a} value={a} className="flex-none">
                                                    {a}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="font-medium">What you love doing</p>
                                        <ToggleGroup type="multiple" variant="outline" value={interests} onValueChange={(v) => setInterests(v as Interest[])} className="grid grid-cols-2 gap-2">
                                            {INTERESTS.map((i) => {
                                                const Icon = INTEREST_ICON[i];
                                                return (
                                                    <ToggleGroupItem key={i} value={i} className="h-auto flex-col gap-2 rounded-xl! border py-4">
                                                        <Icon className="size-6" aria-hidden="true" />
                                                        {i}
                                                    </ToggleGroupItem>
                                                );
                                            })}
                                        </ToggleGroup>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="font-medium">Membership</p>
                                        <RadioGroup value={tier} onValueChange={(v) => setTier(v as Level)} className="gap-3">
                                            <Choice value="member" icon={UserIcon} title="Member" body="Book, keep your tickets, save places and review where you went. Free." />
                                            <Choice value="ambassador" icon={MegaphoneIcon} title="Ambassador" body={`Everything members get, plus a personal link that earns you ${pct(ambassadorShare)} of every sale it brings in.`} />
                                        </RadioGroup>
                                    </div>
                                </div>
                            )}

                            {step === 2 && path === 'entertainer' && (
                                <div className="space-y-5">
                                    <h1 className="font-display text-3xl">Your business</h1>
                                    <Field id="join-business" label="Name fans will see" error={errors.business} hint="A venue, a promoter, a band or your stage name.">
                                        <Input id="join-business" value={business} onChange={(e) => setBusiness(e.target.value)} className="h-11" aria-invalid={Boolean(errors.business)} autoFocus />
                                    </Field>
                                    <Field id="join-bio" label="What you offer" error={errors.bio}>
                                        <Textarea id="join-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A rooftop bar in Masaki with live music on Fridays." aria-invalid={Boolean(errors.bio)} />
                                    </Field>
                                    <p className="flex items-start gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                                        <SparklesIcon className="size-5 shrink-0" aria-hidden="true" />
                                        The Timbuktu team checks every new entertainer before their listings can go live.
                                    </p>
                                </div>
                            )}

                            <div className={cn('flex gap-3', step === 0 ? 'justify-end' : 'justify-between')}>
                                {step > 0 && (
                                    <Button type="button" variant="ghost" size="lg" onClick={() => setStep(step - 1)}>
                                        <ArrowLeftIcon />
                                        Back
                                    </Button>
                                )}
                                <Button type="submit" size="xl">
                                    {step < 2 ? 'Continue' : path === 'fan' ? 'Finish' : 'Send for approval'}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <DemoControls />
        </div>
    );
}
