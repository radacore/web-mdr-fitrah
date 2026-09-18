import { useState } from 'react';

interface HasilApi<T> {
    data: T | null;
    memuat: boolean;
    galat: string | null;
    jalankan: () => Promise<void>;
}

/**
 * Memanggil endpoint API internal yang menjalankan proses pelatihan model.
 * Digunakan oleh halaman pengujian SMOTE dan skenario pengujian.
 */
export function useMlProcess<T extends { error?: string }>(
    endpoint: string,
): HasilApi<T> {
    const [data, setData] = useState<T | null>(null);
    const [memuat, setMemuat] = useState(false);
    const [galat, setGalat] = useState<string | null>(null);

    const jalankan = async () => {
        setMemuat(true);
        setGalat(null);
        setData(null);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
            });

            const json = (await response.json()) as T;

            if (!response.ok) {
                setGalat(json.error ?? 'Proses gagal dijalankan.');
                return;
            }

            setData(json);
        } catch {
            setGalat(
                'Tidak dapat menghubungi server. Pastikan layanan machine learning berjalan.',
            );
        } finally {
            setMemuat(false);
        }
    };

    return { data, memuat, galat, jalankan };
}
