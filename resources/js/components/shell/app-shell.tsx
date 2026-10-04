import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useApp } from '@/store/app-store';
import { useEffect, type ReactNode } from 'react';

/** Wraps every page: providers, toasts, and picking up an ambassador's ?ref= code. The demo controls sit in each layout, inside Inertia. */
export function AppShell({ children }: { children: ReactNode }) {
    const captureReferral = useApp((s) => s.captureReferral);
    useEffect(() => {
        const ref = new URLSearchParams(window.location.search).get('ref');
        if (ref) captureReferral(ref);
    }, [captureReferral]);

    return (
        <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position="top-center" />
        </TooltipProvider>
    );
}
