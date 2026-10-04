import '../css/app.css';

import { AppShell } from '@/components/shell/app-shell';
import { ConsoleLayout } from '@/layouts/console-layout';
import { FanLayout } from '@/layouts/fan-layout';
import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

type PageComponent = ComponentType<any> & { layout?: (page: ReactNode) => ReactNode };
type PageModule = { default: PageComponent };

createInertiaApp({
    title: (title) => (title ? `${title} · Timbuktu` : 'Timbuktu: every kind of good time in Tanzania'),
    resolve: async (name) => {
        const pages = import.meta.glob<PageModule>('./pages/**/*.tsx');
        const loader = pages[`./pages/${name}.tsx`];
        if (!loader) throw new Error(`Page not found: ${name}`);
        const page = await loader();
        const Component = page.default;
        if (Component.layout === undefined) {
            if (name.startsWith('studio/')) Component.layout = (p) => <ConsoleLayout area="studio">{p}</ConsoleLayout>;
            else if (name.startsWith('admin/')) Component.layout = (p) => <ConsoleLayout area="admin">{p}</ConsoleLayout>;
            else if (name !== 'join') Component.layout = (p) => <FanLayout>{p}</FanLayout>;
        }
        return Component;
    },
    setup({ el, App, props }) {
        createRoot(el!).render(
            <AppShell>
                <App {...props} />
            </AppShell>,
        );
    },
    progress: { color: 'var(--primary)', delay: 200 },
});
