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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PALETTES, setPalette, usePalette, type PaletteId } from '@/lib/palette';
import { cn } from '@/lib/utils';
import { useApp, useCurrentFan } from '@/store/app-store';
import type { Role } from '@/types';
import { AdjustmentsHorizontalIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';

const HOME: Record<Role, string> = { fan: '/', studio: '/studio', admin: '/admin' };

/** There is no sign-in yet, so this panel stands in for it: switch side, change the fan's level, reset the sample data. */
export function DemoControls() {
    const { url } = usePage();
    const session = useApp((s) => s.session);
    const fan = useCurrentFan();
    const setRole = useApp((s) => s.setRole);
    const setFanLevel = useApp((s) => s.setFanLevel);
    const resetDemo = useApp((s) => s.resetDemo);
    const area: Role = url.startsWith('/studio') ? 'studio' : url.startsWith('/admin') ? 'admin' : 'fan';
    const level = session.signedIn ? fan.level : 'signed-out';
    const palette = usePalette();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'fixed right-4 z-40 h-11 rounded-full bg-card shadow-float',
                        area === 'fan' ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-5' : 'bottom-5',
                    )}
                >
                    <AdjustmentsHorizontalIcon className="size-5" />
                    <span className="hidden sm:inline">Demo controls</span>
                    <span className="sr-only sm:hidden">Demo controls</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-5 p-5">
                <div className="space-y-1">
                    <p className="font-medium">Demo controls</p>
                    <p className="text-sm text-muted-foreground">Sign-in and payments are simulated. Sample data lives in this browser and starts fresh each day.</p>
                </div>
                <div className="space-y-2">
                    <Label>View as</Label>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={area}
                        onValueChange={(v) => {
                            if (!v) return;
                            setRole(v as Role);
                            router.visit(HOME[v as Role]);
                        }}
                        className="w-full"
                    >
                        <ToggleGroupItem value="fan" className="flex-1">
                            Fan
                        </ToggleGroupItem>
                        <ToggleGroupItem value="studio" className="flex-1">
                            Entertainer
                        </ToggleGroupItem>
                        <ToggleGroupItem value="admin" className="flex-1">
                            Admin
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
                <div className="space-y-2">
                    <Label>Fan ({fan.name.split(' ')[0]})</Label>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={level}
                        onValueChange={(v) => v && setFanLevel(v as typeof level)}
                        className="w-full"
                    >
                        <ToggleGroupItem value="signed-out" className="flex-1">
                            Signed out
                        </ToggleGroupItem>
                        <ToggleGroupItem value="member" className="flex-1">
                            Member
                        </ToggleGroupItem>
                        <ToggleGroupItem value="ambassador" className="flex-1">
                            Ambassador
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
                <div className="space-y-2">
                    <Label>Colours</Label>
                    <div role="radiogroup" aria-label="Colour palette" className="grid grid-cols-2 gap-2">
                        {PALETTES.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                role="radio"
                                aria-checked={palette === p.id}
                                aria-label={p.name}
                                title={p.name}
                                onClick={() => setPalette(p.id as PaletteId)}
                                className={cn('flex h-10 overflow-hidden rounded-lg ring-offset-2 ring-offset-popover', palette === p.id ? 'ring-2 ring-foreground' : 'ring-1 ring-border')}
                            >
                                <span className="flex-1" style={{ background: p.swatch[0] }} />
                                <span className="w-3" style={{ background: p.swatch[1] }} />
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{PALETTES.find((p) => p.id === palette)?.name}</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Promo codes: <span className="font-medium text-foreground">KARIBU10</span> (10% off) and <span className="font-medium text-foreground">WIKIENDI15</span> (15% off).
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <ArrowPathIcon />
                            Reset demo data
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reset the sample data?</AlertDialogTitle>
                            <AlertDialogDescription>Bookings, reviews, listings and settings you changed in this browser go back to the starting set.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Keep my changes</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    resetDemo();
                                    toast.success('Sample data reset');
                                    router.visit(HOME[area]);
                                }}
                            >
                                Reset
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </PopoverContent>
        </Popover>
    );
}
