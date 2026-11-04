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
    tanggal_awal_pengobatan: 'Tanggal Awal Pengobatan',
    durasi_pengobatan: 'Durasi Pengobatan',
    status_pengobatan: 'Status Pengobatan',
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

/**
 * Tanggal awal pengobatan menentukan durasi dan status pengobatan. Keduanya
 * merupakan variabel turunan tampilan, bukan masukan model: model tetap
 * memakai 17 variabel penelitian. Perhitungan di sini hanya untuk pratinjau
 * formulir; nilai yang disimpan dihitung ulang di server
 * (TrainingData::durasiPengobatan) dengan algoritma yang sama.
 */
export const BATAS_BULAN_PENGOBATAN_LAMA = 6;

export const STATUS_PENGOBATAN_BARU = 'Pengobatan Baru';

export const STATUS_PENGOBATAN_LAMA = 'Pengobatan Lama';

/**
 * Zona waktu acuan layanan kesehatan, sama dengan TrainingData::ZONA_WAKTU,
 * agar batas tanggal di peramban tidak berbeda dengan validasi server.
 */
export const ZONA_WAKTU = 'Asia/Makassar';

/** Tanggal hari ini (YYYY-MM-DD) menurut zona waktu layanan kesehatan. */
export function tanggalHariIni(): string {
    const bagian = new Intl.DateTimeFormat('en-GB', {
        timeZone: ZONA_WAKTU,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const ambil = (tipe: 'year' | 'month' | 'day'): string =>
        bagian.find((item) => item.type === tipe)?.value ?? '';

    return `${ambil('year')}-${ambil('month')}-${ambil('day')}`;
}

/** Menampilkan tanggal ISO (YYYY-MM-DD) dalam format Indonesia. */
export function formatTanggal(tanggal: string | null | undefined): string {
    if (!tanggal) return '-';

    // Cast tanggal Eloquent berbentuk ISO lengkap; cukup bagian tanggal agar
    // tidak bergeser hari karena konversi zona waktu.
    const nilai = new Date(`${tanggal.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(nilai.getTime())) return '-';

    return nilai.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Menambah bulan kalender tanpa overflow: 31 Januari + 1 bulan menjadi
 * 28/29 Februari, sama seperti addMonthNoOverflow pada Carbon.
 */
function tambahBulan(tanggal: Date, jumlah: number): Date {
    const hasil = new Date(tanggal.getTime());
    const hari = hasil.getDate();

    hasil.setDate(1);
    hasil.setMonth(hasil.getMonth() + jumlah);

    const akhirBulan = new Date(
        hasil.getFullYear(),
        hasil.getMonth() + 1,
        0,
    ).getDate();

    hasil.setDate(Math.min(hari, akhirBulan));

    return hasil;
}

function formatDurasi(bulan: number, hari: number): string {
    const bagian: string[] = [];

    if (bulan > 0) bagian.push(`${bulan} bulan`);
    if (hari > 0) bagian.push(`${hari} hari`);

    return bagian.length > 0 ? bagian.join(' ') : '0 hari';
}

export interface DurasiPengobatan {
    bulan: number;
    hari: number;
    label: string;
}

export function hitungDurasiPengobatan(tanggal: string): DurasiPengobatan {
    if (!tanggal) return { bulan: 0, hari: 0, label: '' };

    // Cast tanggal Eloquent dapat berbentuk ISO lengkap; cukup bagian tanggal.
    const mulai = new Date(`${tanggal.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(mulai.getTime())) {
        return { bulan: 0, hari: 0, label: '' };
    }

    // "Hari ini" memakai zona waktu layanan kesehatan, bukan waktu peramban,
    // agar pratinjau sama dengan perhitungan server.
    const akhir = new Date(`${tanggalHariIni()}T00:00:00`);

    if (mulai > akhir) return { bulan: 0, hari: 0, label: '' };

    let bulan = 0;
    let kursor = new Date(mulai.getTime());

    while (tambahBulan(kursor, 1) <= akhir) {
        kursor = tambahBulan(kursor, 1);
        bulan += 1;
    }

    const hari = Math.round((akhir.getTime() - kursor.getTime()) / 86_400_000);

    return { bulan, hari, label: formatDurasi(bulan, hari) };
}

export function tentukanStatusPengobatan(bulan: number): string {
    return bulan >= BATAS_BULAN_PENGOBATAN_LAMA
        ? STATUS_PENGOBATAN_LAMA
        : STATUS_PENGOBATAN_BARU;
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
