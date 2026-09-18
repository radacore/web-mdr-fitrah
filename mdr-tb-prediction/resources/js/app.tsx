import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

/*
 * Komponen Select dan Dialog mengunci interaksi halaman dengan menyetel
 * pointer-events: none pada body selama komponen terbuka. Bila pengguna
 * berpindah halaman saat komponen tersebut masih terbuka, komponen dilepas
 * tanpa membersihkan gaya tersebut sehingga seluruh halaman baru tidak dapat
 * diklik. Gaya dibersihkan setiap kali navigasi selesai.
 */
router.on('navigate', () => {
    document.body.style.removeProperty('pointer-events');
});

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        // Warna progress mengikuti biru primary Universitas Muhammadiyah
        // Makassar (#005DAA), seperti pada palet CSS.
        color: '#005DAA',
    },
});
