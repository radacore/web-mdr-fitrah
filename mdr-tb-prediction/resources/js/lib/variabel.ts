/**
 * Nilai yang diperbolehkan untuk setiap variabel yang diisi pengguna.
 * Harus konsisten dengan LABEL_ENCODINGS pada ml-service/src/preprocessing.py.
 *
 * Kategori usia tidak dicantumkan karena merupakan variabel turunan yang
 * ditentukan oleh tentukanKategoriUsia, bukan dipilih pengguna.
 */
export const OPSI = {
    jenis_kelamin: ['Laki-Laki', 'Perempuan'],
    status_bekerja: ['Bekerja', 'Tidak Bekerja'],
    status_gizi: ['Gizi Kurang', 'Gizi Normal', 'Gizi Lebih'],
    status_merokok: ['Merokok', 'Tidak Merokok'],
    pemeriksaan_kontak: ['Ya', 'Tidak'],
    riwayat_dm: ['Ada', 'Tidak'],
    riwayat_hiv: ['Ada', 'Tidak'],
    komorbiditas: ['Ada', 'Tidak Ada'],
    kepatuhan_minum_obat: ['Patuh', 'Tidak Patuh'],
    efek_samping_obat: ['Ada Keluhan', 'Tidak Ada Keluhan'],
    riwayat_pengobatan: ['Kasus Baru', 'Kasus Lama'],
    panduan_pengobatan: ['Jangka Pendek', 'Jangka Panjang'],
    keberhasilan_pengobatan: ['Berhasil', 'Tidak Berhasil'],
} as const;

/** Label yang ditampilkan pada antarmuka untuk setiap variabel. */
export const LABEL: Record<string, string> = {
    usia: 'Kategori Usia',
    ket_usia: 'Usia (tahun)',
    jenis_kelamin: 'Jenis Kelamin',
    status_bekerja: 'Status Bekerja',
    bb: 'Berat Badan (kg)',
    tb: 'Tinggi Badan (cm)',
    imt: 'Indeks Massa Tubuh (IMT)',
    status_gizi: 'Status Gizi',
    status_merokok: 'Status Merokok',
    pemeriksaan_kontak: 'Pemeriksaan Kontak',
    riwayat_dm: 'Riwayat Diabetes',
    riwayat_hiv: 'Riwayat HIV',
    komorbiditas: 'Komorbiditas Lain',
    kepatuhan_minum_obat: 'Kepatuhan Minum Obat',
    efek_samping_obat: 'Efek Samping Obat',
    keterangan_efek_samping: 'Keterangan Efek Samping',
    riwayat_pengobatan: 'Riwayat Pengobatan Sebelumnya',
    panduan_pengobatan: 'Panduan Pengobatan',
    keberhasilan_pengobatan: 'Keberhasilan Pengobatan',
};

/** Nama variabel pada layanan ML dipetakan ke label antarmuka. */
export const LABEL_FITUR_ML: Record<string, string> = {
    'Ket.Usia': 'Usia (tahun)',
    BB: 'Berat Badan',
    TB: 'Tinggi Badan',
    IMT: 'Indeks Massa Tubuh',
    Usia: 'Kategori Usia',
    'Jenis Kelamin': 'Jenis Kelamin',
    'Status Bekerja': 'Status Bekerja',
    'Status Gizi': 'Status Gizi',
    'Status Merokok': 'Status Merokok',
    'Pemeriksaan Kontak': 'Pemeriksaan Kontak',
    Riwayat_DM: 'Riwayat Diabetes',
    Riwayat_HIV: 'Riwayat HIV',
    Komorbiditas: 'Komorbiditas Lain',
    'Kepatuhan Minum Obat': 'Kepatuhan Minum Obat',
    'Efek Samping Obat': 'Efek Samping Obat',
    'Riwayat Pengobatan Sebelumnya': 'Riwayat Pengobatan Sebelumnya',
    'Panduan Pengobatan': 'Panduan Pengobatan',
};

/** Kelompok variabel untuk penyusunan formulir. */
export const KELOMPOK_VARIABEL = [
    {
        judul: 'Data Demografis',
        keterangan: 'Kategori usia ditentukan otomatis dari usia pasien',
        fields: ['ket_usia', 'jenis_kelamin', 'status_bekerja'],
    },
    {
        judul: 'Kondisi Fisik',
        keterangan: 'IMT dihitung otomatis dari berat dan tinggi badan',
        fields: ['bb', 'tb', 'status_gizi', 'status_merokok'],
    },
    {
        judul: 'Riwayat Kesehatan',
        keterangan: 'Komorbiditas dan hasil pemeriksaan',
        fields: [
            'pemeriksaan_kontak',
            'riwayat_dm',
            'riwayat_hiv',
            'komorbiditas',
        ],
    },
    {
        judul: 'Data Pengobatan',
        keterangan: 'Riwayat dan kondisi selama menjalani pengobatan',
        fields: [
            'kepatuhan_minum_obat',
            'efek_samping_obat',
            'riwayat_pengobatan',
            'panduan_pengobatan',
        ],
    },
] as const;

/**
 * Batas usia yang memisahkan kategori usia produktif dan usia lanjut.
 * Harus sama dengan BATAS_USIA_LANJUT pada ml-service/src/preprocessing.py
 * dan TrainingData::BATAS_USIA_LANJUT pada aplikasi web.
 */
export const BATAS_USIA_LANJUT = 45;

/**
 * Kategori usia merupakan variabel turunan dari usia dalam tahun, sama seperti
 * IMT yang diturunkan dari berat dan tinggi badan. Nilainya ditampilkan sebagai
 * hasil perhitungan agar tidak terjadi ketidaksesuaian dengan usia pasien.
 */
export function tentukanKategoriUsia(usiaTahun: number | string): string {
    const usia = Number(usiaTahun);

    if (!usia || usia <= 0) return '';

    return usia >= BATAS_USIA_LANJUT ? 'Usia Lanjut' : 'Usia Produktif';
}

export function hitungImt(bb: number | string, tb: number | string): number {
    const beratBadan = Number(bb);
    const tinggiBadan = Number(tb);

    if (!beratBadan || !tinggiBadan || tinggiBadan <= 0) return 0;

    const meter = Math.trunc(tinggiBadan) / 100;
    return Math.round((Math.trunc(beratBadan) / meter ** 2) * 100) / 100;
}

export function formatPersen(nilai: number | null | undefined, digit = 2): string {
    if (nilai === null || nilai === undefined || Number.isNaN(nilai)) return '-';
    return `${(nilai * 100).toFixed(digit)}%`;
}

export function formatAngka(nilai: number | null | undefined, digit = 4): string {
    if (nilai === null || nilai === undefined || Number.isNaN(nilai)) return '-';
    return nilai.toFixed(digit);
}
