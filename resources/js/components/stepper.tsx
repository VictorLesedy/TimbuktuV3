import { Button } from '@/components/ui/button';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

export function Stepper({ value, onChange, min = 1, max, label }: { value: number; onChange: (n: number) => void; min?: number; max: number; label: string }) {
    return (
        <div className="flex items-center gap-1 rounded-full border p-1" role="group" aria-label={label}>
            <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
                <MinusIcon />
            </Button>
            <output aria-live="polite" className="w-8 text-center font-semibold tabular">
                {value}
            </output>
            <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
                <PlusIcon />
            </Button>
        </div>
    );
}
