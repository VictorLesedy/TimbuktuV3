import { Container } from '@/components/container';
import { Head } from '@inertiajs/react';

/** A page that is not built yet: a huge TODO and its name, so every route still renders. */
export function Todo({ title }: { title: string }) {
    return (
        <>
            <Head title={title} />
            <Container className="py-24 md:py-32">
                <h1 className="font-display text-[clamp(4rem,16vw,14rem)] leading-[1]">//TODO</h1>
                <p className="mt-6 text-xl text-muted-foreground">{title}</p>
            </Container>
        </>
    );
}
