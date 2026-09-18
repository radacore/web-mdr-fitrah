export type Role = 'admin' | 'tenaga_medis';

export interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
    role_label: string;
    is_admin: boolean;
}

/** Metrik evaluasi berbasis confusion matrix (Bab II.A.6) */
export interface Metrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
}

export interface ConfusionMatrix {
    true_positive: number;
    true_negative: number;
    false_positive: number;
    false_negative: number;
}

/** Feature importance Random Forest (Bab II.A.13) */
export interface FeatureImportance {
    feature: string;
    importance: number;
}

export interface CvMetric {
    mean: number;
    std: number;
    scores: number[];
}

/**
 * Rekomendasi tindakan klinis yang disusun dari faktor risiko pasien
 * (Bab II.A.20). Dihasilkan oleh App\Services\RekomendasiKlinis.
 */
export interface TindakanKlinis {
    faktor: string;
    prioritas: 'Tinggi' | 'Sedang';
    tindakan: string;
}

export interface Rekomendasi {
    tingkat_risiko: 'Tinggi' | 'Sedang' | 'Rendah';
    ringkasan: string;
    tindakan: TindakanKlinis[];
    jumlah_faktor_risiko: number;
    catatan: string;
}

export interface CvResults {
    accuracy: CvMetric;
    precision: CvMetric;
    recall: CvMetric;
    f1: CvMetric;
}

export interface ClassDistribution {
    Berhasil: number;
    'Tidak Berhasil': number;
    total: number;
    persen_berhasil: number;
    persen_tidak_berhasil: number;
    rasio_ketidakseimbangan: number;
    kelas_minoritas: string;
}

export interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success: string | null;
        error: string | null;
    };
};
