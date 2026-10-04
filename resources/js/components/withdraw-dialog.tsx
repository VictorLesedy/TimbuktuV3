import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalisePhone, tsh } from '@/lib/format';
import { useApp } from '@/store/app-store';
import { NETWORKS, type Network, type Payout } from '@/types';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { toast } from 'sonner';

const MINIMUM = 5000;

/** Withdraw an available balance to a mobile money number. */
export function WithdrawDialog({ party, ownerId, balance, phone: defaultPhone }: { party: Payout['party']; ownerId: string; balance: number; phone: string }) {
    const withdraw = useApp((s) => s.withdraw);
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(String(Math.floor(balance)));
    const [network, setNetwork] = useState<Network>('M-Pesa');
    const [phone, setPhone] = useState(defaultPhone);
    const [error, setError] = useState('');

    const submit = () => {
        const n = Number(amount);
        const normalised = normalisePhone(phone);
        if (!(n >= MINIMUM)) return setError(`The smallest withdrawal is ${tsh(MINIMUM)}.`);
        if (n > balance) return setError(`You can withdraw up to ${tsh(balance)}.`);
        if (!normalised) return setError('Enter a Tanzanian mobile number, like 0754 123 456.');
        withdraw({ party, ownerId, amount: n, network, phone: normalised });
        setOpen(false);
        toast.success(`${tsh(n)} sent to ${network}`, { description: `It should arrive on ${normalised} within a few minutes.` });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (o) {
                    setAmount(String(Math.floor(balance)));
                    setError('');
                }
            }}
        >
            <DialogTrigger asChild>
                <Button size="lg" disabled={balance < MINIMUM}>
                    <BanknotesIcon />
                    Withdraw
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Withdraw to mobile money</DialogTitle>
                    <DialogDescription>Available now: {tsh(balance)}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="wd-amount">Amount (TSh)</Label>
                        <Input id="wd-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="wd-network">Network</Label>
                            <Select value={network} onValueChange={(v) => setNetwork(v as Network)}>
                                <SelectTrigger id="wd-network" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {NETWORKS.map((n) => (
                                        <SelectItem key={n} value={n}>
                                            {n}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wd-phone">Number</Label>
                            <Input id="wd-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button onClick={submit}>Send {amount ? tsh(Number(amount)) : ''}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
