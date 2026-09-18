import { Badge } from '@/ShadcnComponents/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import { cn } from '@/lib/utils';
import { Rekomendasi } from '@/types';
import { ClipboardList, ShieldAlert } from 'lucide-react';

interface Props {
    rekomendasi: Rekomendasi;
}

/** Warna penanda untuk setiap tingkat risiko pasien. */
const GAYA_RISIKO: Record<Rekomendasi['tingkat_risiko'], string> = {
    Tinggi: 'border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
    Sedang: 'border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
    Rendah: 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
};

const GAYA_TEKS_RISIKO: Record<Rekomendasi['tingkat_risiko'], string> = {
    Tinggi: 'text-red-700 dark:text-red-400',
    Sedang: 'text-amber-700 dark:text-amber-400',
    Rendah: 'text-emerald-700 dark:text-emerald-400',
};

/**
 * Rekomendasi tindakan klinis yang diturunkan dari hasil klasifikasi dan
 * faktor risiko pasien.
 *
 * Sistem pendukung keputusan tidak berhenti pada label klasifikasi, tetapi
 * juga merekomendasikan tindakan penanganan agar intervensi medis dapat
 * dilakukan lebih awal (Bab II.A.20). Isi rekomendasi berasal dari
 * App\Services\RekomendasiKlinis pada sisi peladen.
 */
export function RekomendasiTindakan({ rekomendasi }: Props) {
    const { tingkat_risiko, ringkasan, tindakan, jumlah_faktor_risiko, catatan } =
        rekomendasi;

    return (
        <Card className={cn('border-2', GAYA_RISIKO[tingkat_risiko])}>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <ClipboardList className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                        <CardTitle className="text-base">
                            Rekomendasi Tindakan Klinis
                        </CardTitle>
                    </div>

                    <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">
                            Tingkat Risiko
                        </p>
                        <p
                            className={cn(
                                'text-lg font-bold leading-tight',
                                GAYA_TEKS_RISIKO[tingkat_risiko],
                            )}
                        >
                            {tingkat_risiko}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {jumlah_faktor_risiko} faktor risiko
                        </p>
                    </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{ringkasan}</p>
            </CardHeader>

            <CardContent className="space-y-3">
                <ol className="space-y-3">
                    {tindakan.map((item, urutan) => (
                        <li
                            key={item.faktor}
                            className="rounded-md border bg-background/70 p-3"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                                    {urutan + 1}
                                </span>
                                <span className="text-sm font-medium">
                                    {item.faktor}
                                </span>
                                <Badge
                                    variant={
                                        item.prioritas === 'Tinggi'
                                            ? 'destructive'
                                            : 'secondary'
                                    }
                                >
                                    Prioritas {item.prioritas}
                                </Badge>
                            </div>
                            <p className="mt-2 pl-8 text-sm text-muted-foreground">
                                {item.tindakan}
                            </p>
                        </li>
                    ))}
                </ol>

                <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    {catatan}
                </p>
            </CardContent>
        </Card>
    );
}
