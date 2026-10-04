import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { setMode, useMode, useModeChoice, type ModeChoice } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';

const OPTIONS: { value: ModeChoice; label: string; icon: typeof SunIcon }[] = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'Same as device', icon: ComputerDesktopIcon },
];

export function ModeSwitcher({ className }: { className?: string }) {
    const mode = useMode();
    const choice = useModeChoice();
    const Icon = mode === 'dark' ? MoonIcon : SunIcon;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-lg" className={cn('rounded-full', className)} aria-label="Light or dark mode">
                    <Icon className="size-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup value={choice} onValueChange={(v) => setMode(v as ModeChoice)}>
                    {OPTIONS.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value} className="gap-2">
                            <o.icon className="size-4" />
                            {o.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
