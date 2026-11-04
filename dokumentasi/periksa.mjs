#!/usr/bin/env node
/**
 * periksa.mjs — memeriksa dokumen hasil build sebelum dicetak.
 *
 *   node periksa.mjs
 *
 * Dua pemeriksaan:
 *   1. Isi setiap halaman tidak melewati area A4 (tidak terpotong saat cetak).
 *   2. Semua gambar berhasil dimuat, bukan placeholder atau berkas hilang.
 *
 * Memakai Chrome yang terpasang di sistem, sama seperti capture.mjs.
 */

import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DOKUMEN = `file://${path.join(ROOT, 'dokumentasi.html')}`;

if (!existsSync(CHROME)) {
    throw new Error(`Chrome tidak ditemukan di ${CHROME}`);
}

const browser = await chromium.launch({ executablePath: CHROME });

try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

    await page.goto(DOKUMEN, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    const hasil = await page.evaluate(() =>
        [...document.querySelectorAll('.page')].map((el, i) => {
            const gaya = getComputedStyle(el);
            const kotak = el.getBoundingClientRect();
            const isi = [...el.children].map((anak) => anak.getBoundingClientRect());
            const terbawah = Math.max(...isi.map((r) => r.bottom));
            const batas = kotak.bottom - parseFloat(gaya.paddingBottom);
            const gambar = [...el.querySelectorAll('img')].map((img) => ({
                src: img.getAttribute('src'),
                dimuat: img.complete && img.naturalWidth > 0,
            }));

            return {
                no: i + 1,
                judul: el.dataset.title || '(tanpa judul)',
                lebih: Math.round((terbawah - batas) * 10) / 10,
                gambar,
            };
        }),
    );

    let bermasalah = 0;

    for (const h of hasil) {
        const potong = h.lebih > 1;
        const gambarRusak = h.gambar.filter((g) => !g.dimuat);

        if (potong || gambarRusak.length > 0) {
            bermasalah += 1;
            const catatan = [];

            if (potong) catatan.push(`isi melewati ${h.lebih} px`);
            if (gambarRusak.length) {
                catatan.push(
                    `gambar gagal dimuat: ${gambarRusak.map((g) => g.src).join(', ')}`,
                );
            }

            console.log(`  ✗ ${String(h.no).padStart(2, '0')} ${h.judul} — ${catatan.join('; ')}`);
        }
    }

    if (bermasalah === 0) {
        console.log(`✓ ${hasil.length} halaman muat, semua gambar dimuat.`);
    } else {
        console.log(`\n${bermasalah} dari ${hasil.length} halaman perlu diperiksa.`);
        process.exitCode = 1;
    }
} finally {
    await browser.close();
}
