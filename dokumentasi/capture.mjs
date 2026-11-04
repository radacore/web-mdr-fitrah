#!/usr/bin/env node
/**
 * capture.mjs — mengambil seluruh screenshot dokumentasi sekali jalan.
 *
 *   node capture.mjs            → potret semua halaman, simpan ke assets/
 *   node capture.mjs hasil      → potret satu halaman saja (berdasarkan nama)
 *
 * Prasyarat: aplikasi web (port 8000) dan layanan ML (port 5000) berjalan.
 * Memakai Chrome yang terpasang di sistem, jadi tidak mengunduh peramban.
 *
 * Setiap halaman dipotret pada lebar 1440 px dengan deviceScaleFactor 2
 * (menghasilkan 2880 px, setara Retina). Tinggi viewport mengikuti rasio yang
 * dipakai halaman dokumentasi, sehingga tidak ada bagian yang terpotong tanpa
 * sengaja. Halaman Hasil Klasifikasi tidak punya URL sendiri — formulir diisi
 * dan dikirim sekali agar halaman itu dapat dipotret.
 */

import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(ROOT, 'assets');
const BASE = process.env.DOK_BASE ?? 'http://127.0.0.1:8000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const AKUN = { email: 'admin@mdrtb.test', password: 'password' };

/**
 * Tanggal awal pengobatan contoh: tepat 8 bulan 12 hari sebelum hari ini,
 * sehingga durasi dan status pengobatan pada tangkapan layar konsisten dengan
 * narasi dokumentasi. Dikurangi 12 hari lebih dulu agar pengurangan bulan
 * kalender tidak meluap pada akhir bulan.
 */
function tanggalContoh() {
    const tanggal = new Date();
    tanggal.setHours(12, 0, 0, 0);
    tanggal.setDate(tanggal.getDate() - 12);
    tanggal.setMonth(tanggal.getMonth() - 8);

    const bulan = String(tanggal.getMonth() + 1).padStart(2, '0');
    const hari = String(tanggal.getDate()).padStart(2, '0');

    return `${tanggal.getFullYear()}-${bulan}-${hari}`;
}

const TANGGAL_CONTOH = tanggalContoh();

/** Isi formulir klasifikasi untuk memicu halaman Hasil. */
const PASIEN_CONTOH = {
    nama_lengkap: 'Pasien Contoh',
    ket_usia: '48',
    jenis_kelamin: 'Laki-Laki',
    status_bekerja: 'Tidak Bekerja',
    bb: '52',
    tb: '168',
    status_gizi: 'Gizi Kurang',
    status_merokok: 'Merokok',
    pemeriksaan_kontak: 'Ya',
    riwayat_dm: 'Ada',
    riwayat_hiv: 'Tidak',
    komorbiditas: 'Ada',
    kepatuhan_minum_obat: 'Tidak Patuh',
    efek_samping_obat: 'Ada Keluhan',
    riwayat_pengobatan: 'Kasus Lama',
    panduan_pengobatan: 'Jangka Panjang',
    tanggal_awal_pengobatan: TANGGAL_CONTOH,
};

const PILIHAN = [
    'jenis_kelamin', 'status_bekerja', 'status_gizi', 'status_merokok',
    'pemeriksaan_kontak', 'riwayat_dm', 'riwayat_hiv', 'komorbiditas',
    'kepatuhan_minum_obat', 'efek_samping_obat', 'riwayat_pengobatan',
    'panduan_pengobatan',
];

const ANGKA = ['ket_usia', 'bb', 'tb'];

/**
 * Daftar potret. `height` menentukan tinggi viewport (= tinggi gambar).
 *
 * Tinggi dipilih dari tiga rasio tetap agar bingkai gambar pada dokumen
 * konsisten:  810 = 16:9 (layar login),  900 = 16:10 (halaman ringkas),
 * 1080 = 4:3 (formulir dan tabel panjang).
 */
const DAFTAR = [
    { name: 'login', url: '/login', height: 810, guest: true, tunggu: 'text=Masuk' },
    { name: 'dashboard', url: '/dashboard', height: 1080, tunggu: 'text=Dashboard' },
    { name: 'klasifikasi', aksi: 'isi-form', height: 1080 },
    { name: 'hasil', height: 1080, aksi: 'klasifikasi' },
    { name: 'riwayat', url: '/prediction/history', height: 900, tunggu: 'text=Riwayat Klasifikasi' },
    { name: 'riwayat-detail', aksi: 'detail-riwayat', height: 1080 },
    { name: 'evaluasi', url: '/prediction/statistics', height: 1080, tunggu: 'text=Evaluasi Model' },
    { name: 'smote', url: '/prediction/compare-smote', height: 1080, tunggu: 'text=Pengujian Efektivitas SMOTE', jalankan: true, hasil: 'text=Kesimpulan Pengujian' },
    { name: 'skenario', url: '/prediction/test-scenarios', height: 1080, tunggu: 'text=Skenario Pengujian', jalankan: true, hasil: 'text=Proporsi Pembagian Terbaik' },
    { name: 'data-rekam-medis', url: '/training-data', height: 900, tunggu: 'text=Data Rekam Medis' },
    { name: 'data-form', url: '/training-data/create', height: 1080, tunggu: 'text=Tambah', isiTanggal: true },
    { name: 'pembersihan', url: '/training-data/cleaning', height: 900, tunggu: 'text=Pembersihan Data' },
    { name: 'akun', url: '/users', height: 900, tunggu: 'text=Manajemen Akun' },
    { name: 'profil', url: '/profile', height: 900, tunggu: 'text=Profil' },
];

function pastikanChrome() {
    if (!existsSync(CHROME)) {
        throw new Error(`Chrome tidak ditemukan di ${CHROME}`);
    }
}

/** Menunggu halaman tenang: jaringan selesai dan animasi masuk berhenti. */
async function tenang(page, ms = 700) {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(ms);
}

async function masuk(page) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', AKUN.email);
    await page.fill('#password', AKUN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await tenang(page);
}

/** Mengisi formulir klasifikasi tanpa mengirimkannya. */
async function isiFormulir(page) {
    await page.goto(`${BASE}/prediction`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#ket_usia');

    for (const nama of ANGKA) {
        await page.fill(`#${nama}`, PASIEN_CONTOH[nama]);
    }

    await page.fill(
        '#tanggal_awal_pengobatan',
        PASIEN_CONTOH.tanggal_awal_pengobatan,
    );

    for (const nama of PILIHAN) {
        await page.click(`#${nama}`);
        await page
            .getByRole('option', { name: PASIEN_CONTOH[nama], exact: true })
            .click();
    }

    const keterangan = page.locator('#keterangan_efek_samping');

    if (await keterangan.count()) {
        await keterangan.fill('Mual dan pusing setelah minum obat.');
    }

    await tenang(page, 400);
}

/** Mengisi formulir klasifikasi, lalu menunggu halaman hasil muncul. */
async function klasifikasi(page) {
    await isiFormulir(page);

    await page.getByRole('button', { name: 'Lakukan Klasifikasi' }).click();
    await page.waitForSelector('text=Hasil Klasifikasi', { timeout: 30000 });
    await tenang(page, 900);
}

/** Membuka satu riwayat klasifikasi untuk dipotret. */
async function detailRiwayat(page) {
    await page.getByRole('link', { name: /Detail|Lihat/i }).first().click();
    await page.waitForURL('**/prediction/*', { timeout: 15000 });
    await tenang(page);
}

async function potret(ctx, item) {
    const page = await ctx.newPage();

    await page.setViewportSize({ width: 1440, height: item.height });

    if (item.aksi === 'klasifikasi') {
        await klasifikasi(page);
    } else if (item.aksi === 'isi-form') {
        await isiFormulir(page);
    } else if (item.aksi === 'detail-riwayat') {
        // Detail dibuka dari tabel riwayat agar tetap memakai tautan asli.
        await page.close();
        return potretDetail(ctx, item);
    } else {
        await page.goto(`${BASE}${item.url}`, { waitUntil: 'domcontentloaded' });

        if (item.tunggu) {
            await page.waitForSelector(item.tunggu, { timeout: 20000 }).catch(() => {});
        }

        await tenang(page);

        // Formulir rekam medis: isi tanggal agar kotak durasi dan status
        // pengobatan pada tangkapan layar tidak kosong.
        if (item.isiTanggal) {
            await page.fill('#tanggal_awal_pengobatan', TANGGAL_CONTOH);
            await tenang(page, 300);
        }

        // Halaman pengujian menghasilkan tabelnya setelah tombol ditekan.
        if (item.jalankan) {
            await page.getByRole('button', { name: /Jalankan Pengujian/ }).click();
            await page
                .waitForSelector(item.hasil, { timeout: 180000 })
                .catch(() => console.warn(`  ! ${item.name}: hasil pengujian tidak muncul`));
            await tenang(page, 1200);
        }
    }

    const isi = await page.evaluate(() => document.documentElement.scrollHeight);
    const target = path.join(ASSETS, `${item.name}.png`);

    await page.screenshot({ path: target });
    console.log(
        `  ✓ ${item.name}.png  ${1440}x${item.height} (isi ${isi}px)`,
    );

    await page.close();
}

async function potretDetail(ctx, item) {
    const page = await ctx.newPage();

    await page.setViewportSize({ width: 1440, height: item.height });
    await page.goto(`${BASE}/prediction/history`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Riwayat Klasifikasi');
    await detailRiwayat(page);

    const target = path.join(ASSETS, `${item.name}.png`);

    await page.screenshot({ path: target });
    console.log(`  ✓ ${item.name}.png  ${1440}x${item.height}`);
    await page.close();
}

async function main() {
    pastikanChrome();
    mkdirSync(ASSETS, { recursive: true });

    const filter = process.argv[2];
    const daftar = filter
        ? DAFTAR.filter((d) => d.name === filter)
        : DAFTAR;

    if (daftar.length === 0) {
        throw new Error(`Tidak ada potret bernama "${filter}".`);
    }

    const browser = await chromium.launch({ executablePath: CHROME });
    const base = {
        viewport: { width: 1440, height: 810 },
        deviceScaleFactor: 2,
    };

    // Sesi tamu untuk halaman login, sesi admin untuk sisanya.
    const tamu = await browser.newContext(base);
    const admin = await browser.newContext(base);

    try {
        console.log('→ Masuk sebagai admin…');
        const halamanMasuk = await admin.newPage();
        await masuk(halamanMasuk);
        await halamanMasuk.close();

        for (const item of daftar) {
            const ctx = item.guest ? tamu : admin;
            await potret(ctx, item);
        }
    } finally {
        await tamu.close();
        await admin.close();
        await browser.close();
    }

    console.log(`\n✓ ${daftar.length} screenshot tersimpan di assets/`);
}

main().catch((err) => {
    console.error('✗ Gagal memotret:', err.message);
    process.exit(1);
});