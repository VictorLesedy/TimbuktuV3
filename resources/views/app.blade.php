<!DOCTYPE html>
<html lang="en" data-mode="light">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#070f26">
        <meta name="description" content="Concerts, match days, rooftops, tours and DJs to hire across Tanzania. See what is on, pay with mobile money and walk in with a QR code.">
        <link rel="icon" href="/icon.svg" type="image/svg+xml">

        {{-- Applies light or dark, and the colour palette, before first paint so they never flash. Keep in sync with resources/js/lib/theme.ts and palette.ts. --}}
        <script>
            (function () {
                var mode = 'dark';
                try {
                    var saved = localStorage.getItem('timbuktu-mode');
                    mode = saved === 'light' || saved === 'dark' ? saved : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                } catch (e) {}
                document.documentElement.dataset.mode = mode;
                try {
                    var palette = localStorage.getItem('timbuktu-palette');
                    if (['ember', 'red', 'navy', 'cobalt', 'forest', 'pink', 'bahari'].indexOf(palette) >= 0) document.documentElement.dataset.palette = palette;
                } catch (e) {}
                document.querySelector('meta[name="theme-color"]').setAttribute('content', mode === 'dark' ? '#070f26' : '#f4f5f7');
            })();
        </script>

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <x-inertia::head>
            <title>Timbuktu</title>
        </x-inertia::head>
    </head>
    <body>
        <x-inertia::app />
    </body>
</html>
