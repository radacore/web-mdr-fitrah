import { Button } from '@/ShadcnComponents/ui/button';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

/**
 * Navigasi halaman untuk tabel data.
 * Label "Previous"/"Next" dari Laravel diganti dengan ikon agar konsisten
 * dan tidak memerlukan penyisipan HTML mentah.
 */
export function Pagination({ links, from, to, total }: Props) {
    if (links.length <= 3) return null;

    const bersihkan = (label: string) =>
        label.replace(/&laquo;|&raquo;|Previous|Next/g, '').trim();

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
                Menampilkan {from ?? 0}–{to ?? 0} dari {total} data
            </p>

            <nav className="flex flex-wrap gap-1" aria-label="Navigasi halaman">
                {links.map((link, index) => {
                    const pertama = index === 0;
                    const terakhir = index === links.length - 1;
                    const teks = bersihkan(link.label);

                    return (
                        <Button
                            key={link.label}
                            variant={link.active ? 'default' : 'outline'}
                            size="icon"
                            className="size-9"
                            disabled={!link.url}
                            onClick={() =>
                                link.url &&
                                router.visit(link.url, { preserveScroll: true })
                            }
                            aria-label={
                                pertama
                                    ? 'Halaman sebelumnya'
                                    : terakhir
                                      ? 'Halaman berikutnya'
                                      : `Halaman ${teks}`
                            }
                            aria-current={link.active ? 'page' : undefined}
                        >
                            {pertama ? (
                                <ChevronLeft className="size-4" />
                            ) : terakhir ? (
                                <ChevronRight className="size-4" />
                            ) : (
                                teks
                            )}
                        </Button>
                    );
                })}
            </nav>
        </div>
    );
}
