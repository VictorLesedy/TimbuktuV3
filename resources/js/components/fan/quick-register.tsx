import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalisePhone } from '@/lib/format';
import { useApp } from '@/store/app-store';
import { useId, useState, type FormEvent } from 'react';

/** Two-field sign-up used at checkout and on listings, so a new fan never loses what they picked. */
export function QuickRegister({ onDone, submitLabel = 'Create account and continue' }: { onDone?: () => void; submitLabel?: string }) {
    const quickRegister = useApp((s) => s.quickRegister);
    const id = useId();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const next: typeof errors = {};
        if (name.trim().split(/\s+/).length < 2) next.name = 'Enter your first and last name.';
        const normalised = normalisePhone(phone);
        if (!normalised) next.phone = 'Enter a Tanzanian mobile number, like 0754 123 456.';
        setErrors(next);
        if (Object.keys(next).length) {
            document.getElementById(next.name ? `${id}-name` : `${id}-phone`)?.focus();
            return;
        }
        quickRegister(name.trim(), normalised!);
        onDone?.();
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor={`${id}-name`}>Full name</Label>
                <Input
                    id={`${id}-name`}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? `${id}-name-error` : undefined}
                    className="h-11"
                />
                {errors.name && (
                    <p id={`${id}-name-error`} className="text-sm text-destructive">
                        {errors.name}
                    </p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${id}-phone`}>Mobile number</Label>
                <Input
                    id={`${id}-phone`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0754 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? `${id}-phone-error` : `${id}-phone-hint`}
                    className="h-11"
                />
                {errors.phone ? (
                    <p id={`${id}-phone-error`} className="text-sm text-destructive">
                        {errors.phone}
                    </p>
                ) : (
                    <p id={`${id}-phone-hint`} className="text-sm text-muted-foreground">
                        Your tickets are linked to this number.
                    </p>
                )}
            </div>
            <Button type="submit" size="lg" className="w-full">
                {submitLabel}
            </Button>
        </form>
    );
}
