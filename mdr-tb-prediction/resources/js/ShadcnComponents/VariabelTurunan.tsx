import { cn } from '@/lib/utils';

/**
 * Menampilkan variabel turunan yang dihitung sistem dari masukan lain, sehingga
 * tidak diisi manual oleh pengguna. Digunakan untuk kategori usia (turunan dari
 * usia dalam tahun), IMT (turunan dari berat dan tinggi badan), serta durasi
 * dan status pengobatan (turunan dari tanggal awal pengobatan).
 */
export function VariabelTurunan({
    label,
    nilai,
    keterangan,
    compact = false,
}: {
    label: string;
    nilai: string;
    keterangan: string;
    compact?: boolean;
}) {
    return (
        <div
            className={cn(
                'rounded-lg border bg-muted/40 px-4 py-3',
                compact ? '' : 'sm:col-span-2',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-lg font-semibold tabular-nums">
                    {nilai || '-'}
                </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>
        </div>
    );
}
