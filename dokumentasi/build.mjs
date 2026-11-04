#!/usr/bin/env node
/**
 * build.mjs — merender konten.mjs menjadi satu dokumen HTML A4.
 *
 *   node build.mjs           → menghasilkan dokumentasi.html
 *   node build.mjs --watch   → bangun ulang otomatis saat konten atau aset berubah
 *
 * Alur:
 *   1. Baca konten.mjs (satu objek = satu halaman) dan pages/00-sampul.html
 *   2. Render setiap halaman dengan nomor, gambar, dan daftar isi otomatis
 *   3. Sisipkan style.css agar hasilnya satu berkas portabel
 *   4. Tulis dokumentasi.html
 *
 * Screenshot dicari di assets/<slug>.png. Bila belum ada, halaman menampilkan
 * kotak placeholder, bukan gambar rusak.
 */

import { readFile, writeFile, stat } from 'node:fs/promises';
import { watch, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { halaman } from './konten.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COVER_FILE = path.join(ROOT, 'pages', '00-sampul.html');
const ASSETS_DIR = path.join(ROOT, 'assets');
const TEMPLATE_FILE = path.join(ROOT, 'template.html');
const STYLE_FILE = path.join(ROOT, 'style.css');
const KONTEN_FILE = path.join(ROOT, 'konten.mjs');
const OUTPUT_FILE = path.join(ROOT, 'dokumentasi.html');

const EXT_GAMBAR = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const WATCH = process.argv.includes('--watch');

/** Tanggal build dalam format Indonesia, mis. "4 November 2026". */
function buildStamp() {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());
}

function escapeHtml(teks) {
    return String(teks)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

/**
 * Markah teks sederhana agar konten.mjs tetap terbaca sebagai naskah:
 *   `kode` → span.path, **tebal** → strong, *miring* → em.
 */
function inline(teks) {
    return escapeHtml(teks)
        .replace(/`([^`]+)`/g, '<span class="path">$1</span>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Mencari berkas gambar di assets/ yang namanya sesuai slug halaman. */
function cariGambar(nama) {
    if (!nama) return null;

    for (const ext of EXT_GAMBAR) {
        const relatif = `assets/${nama}${ext}`;

        if (existsSync(path.join(ROOT, relatif))) return relatif;
    }

    return null;
}

function isiGambar(nama, judul) {
    const src = cariGambar(nama);

    if (src) {
        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(judul)}">`;
    }

    return `<div class="shot-placeholder">
                <div class="ph-icon">＋</div>
                <p class="ph-title">Screenshot belum dipasang</p>
                <p class="ph-hint">
                    Jalankan <code>node capture.mjs</code>, atau simpan tangkapan layar
                    sebagai <code>assets/${escapeHtml(nama)}.png</code>.
                </p>
            </div>`;
}

function blokGambar(halamanItem, nomorGambar) {
    if (!halamanItem.shot) return '';

    const rasio = halamanItem.rasio || '16 / 9';

    return `    <figure class="shot">
        <div class="shot-frame" style="--shot-ratio: ${escapeHtml(rasio)}">${isiGambar(halamanItem.shot, halamanItem.judul)}</div>
        <figcaption>
            <span class="fig-no">Gambar ${nomorGambar}</span>
            <span>${inline(halamanItem.caption || halamanItem.judul)}</span>
        </figcaption>
    </figure>`;
}

function renderHalaman(item, no, total, nomorGambar) {
    const poin = item.poin
        .map((teks) => `                        <li>${inline(teks)}</li>`)
        .join('\n');

    return `<!-- ===== ${item.slug} ===== -->
<section class="page"
         data-title="${escapeHtml(item.judul)}"
         data-module="${escapeHtml(item.modul)}"
         data-shot="${escapeHtml(item.shot || '')}">

    <header class="page-head">
        <span class="head-module">Modul ${escapeHtml(item.modul)}</span>
        <span class="head-no">Halaman ${no} / ${total}</span>
    </header>

    <div class="page-title">
        <h2>${escapeHtml(item.judul)}</h2>
        <p class="subtitle">${inline(item.subjudul)}</p>
    </div>

${blokGambar(item, nomorGambar)}

    <div class="panel">
        <p class="panel-title">
            Penjelasan Detail
            <span class="panel-note">poin yang perlu dipahami sebelum menjelaskan</span>
        </p>

        <div class="explain">
            <div class="col">
                <div>
                    <h4>Fungsi halaman</h4>
                    <p>${inline(item.fungsi)}</p>
                </div>

                <p class="highlight">
                    <strong>Inti yang disampaikan:</strong> ${inline(item.inti)}
                </p>
            </div>

            <div class="col">
                <div>
                    <h4>Poin yang harus dijelaskan</h4>
                    <ul>
${poin}
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <footer class="page-foot">
        <span>Sistem Klasifikasi Keberhasilan Pengobatan Pasien MDR-TB</span>
        <span>Halaman ${no} dari ${total}</span>
    </footer>

</section>`;
}

function buatDaftarIsi(total) {
    const baris = halaman
        .map((item, i) => {
            const no = i + 2; // halaman 1 adalah sampul

            return `        <li>
            <span class="toc-no">${String(no).padStart(2, '0')}</span>
            <span class="toc-label">${escapeHtml(item.judul)}</span>
            <span class="toc-dots"></span>
            <span class="toc-module">${escapeHtml(item.modul)}</span>
            <span class="toc-page">${no}</span>
        </li>`;
        })
        .join('\n');

    return `<ol>\n${baris}\n    </ol>`;
}

async function build() {
    const mulai = Date.now();

    const [template, style, sampul] = await Promise.all([
        readFile(TEMPLATE_FILE, 'utf8'),
        readFile(STYLE_FILE, 'utf8'),
        readFile(COVER_FILE, 'utf8'),
    ]);

    const total = halaman.length + 1;
    const stamp = buildStamp();
    const daftarIsi = buatDaftarIsi(total);

    const isiHalaman = halaman
        .map((item, i) => renderHalaman(item, i + 2, total, i + 1))
        .join('\n\n');

    const isiSampul = sampul
        .replaceAll('{{TOC}}', daftarIsi)
        .replaceAll('{{BUILD_STAMP}}', stamp);

    const hasil = template
        .replaceAll('{{STYLE}}', () => style)
        .replaceAll('{{PAGES}}', () => `${isiSampul}\n\n${isiHalaman}`)
        .replaceAll('{{TOTAL_PAGES}}', String(total))
        .replaceAll('{{BUILD_STAMP}}', stamp);

    await writeFile(OUTPUT_FILE, hasil, 'utf8');

    const { size } = await stat(OUTPUT_FILE);
    const kb = (size / 1024).toFixed(1);

    console.log(
        `✓ dokumentasi.html — ${total} halaman, ${kb} kB, ${Date.now() - mulai} ms`,
    );

    halaman.forEach((item, i) => {
        const status = cariGambar(item.shot) ? 'gambar ✓' : `belum ada ${item.shot}.png`;

        console.log(
            `  ${String(i + 2).padStart(2, '0')}  ${item.slug.padEnd(20)} ${status}`,
        );
    });
}

async function main() {
    await build();

    if (!WATCH) return;

    console.log('\nMemantau perubahan… (Ctrl+C untuk berhenti)');

    let timer = null;
    const jadwalkan = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            build().catch((err) => console.error('✗ Gagal membangun:', err.message));
        }, 120);
    };

    for (const target of [
        KONTEN_FILE,
        COVER_FILE,
        TEMPLATE_FILE,
        STYLE_FILE,
        ASSETS_DIR,
    ]) {
        if (existsSync(target)) watch(target, jadwalkan);
    }
}

main().catch((err) => {
    console.error('✗ Gagal membangun:', err.message);
    process.exit(1);
});
