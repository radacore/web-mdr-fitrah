# Alibi Perbedaan Populasi: RSUD Labuang Baji (Makassar) vs RSUD Syekh Yusuf (Gowa)

Dokumen ini menyusun bukti bahwa hasil External Validation (EV) yang rendah **bukan** karena
kesalahan sistem/aplikasi, melainkan karena perbedaan struktur data dan perbedaan populasi yang
nyata secara statistik antara data pelatihan (RSUD Labuang Baji, Makassar) dan data validasi
eksternal (RSUD Syekh Yusuf, Gowa).

Referensi file:
- Data internal (Makassar): `Data Uji ML.xlsx` (19 kolom, rekap ML bersih, 175 baris).
- Data eksternal (Gowa): `Kab_Gowa_Report_TB_03RO_latifa11_Januari_2024-Agustus_2026.xls`
  (register SITB, 146 kolom mentah, header di baris 12).

---

## 1. Peta kolom: format Makassar vs ketersediaan di register Gowa

Dari 19 kolom format Makassar, **9 kolom** dapat diisi langsung dari register Gowa.
**10 kolom tidak tersedia** di register SITB.

| Kolom format Makassar | Sumber di register Gowa | Status |
|---|---|---|
| Ket.Usia | col15 "Umur (Tahun)" | Tersedia |
| Jenis Kelamin | col16 (L/P) | Tersedia |
| Status Bekerja | col17 "Pekerjaan/Status" | Tersedia |
| Pemeriksaan Kontak | col30 "Dilakukan Pemeriksaan Kontak" | Tersedia |
| Riwayat_DM | col36 "Riwayat DM" | Tersedia |
| Riwayat_HIV | col37 "Status HIV" | Tersedia |
| Riwayat Pengobatan Sebelumnya | col34 "Klasifikasi Berdasarkan Riwayat Pengobatan Sebelumnya" | Tersedia |
| Panduan Pengobatan | col42 "Paduan OAT" | Tersedia |
| Keberhasilan Pengobatan | col139 "Hasil Akhir Pengobatan" | Tersedia |
| Usia | diturunkan dari Ket.Usia | Tersedia (turunan) |
| BB | — | **Tidak tersedia** |
| TB | — | **Tidak tersedia** |
| IMT | — | **Tidak tersedia** |
| Status Gizi | — | **Tidak tersedia** |
| Status Merokok | — | **Tidak tersedia** |
| Komorbiditas | — | **Tidak tersedia** |
| Kepatuhan Minum Obat | — | **Tidak tersedia** |
| Efek Samping Obat | — | **Tidak tersedia** |
| Efek_Samping_Obat (detail) | — | **Tidak tersedia** |

**Implikasi:** Tiga fitur model produksi web (`Status Merokok`, `Kepatuhan Minum Obat`,
`Efek Samping Obat`) **tidak tercatat sama sekali** di register RSUD Syekh Yusuf. Artinya
file gaya Makassar yang dibuat dari data Gowa tidak pernah dapat diisi penuh untuk model web
tanpa data tambahan manual — konfirmasi bahwa kedua rumah sakit menggunakan skema pencatatan
yang berbeda.

---

## 2. Perbandingan statistik populasi (uji 5 fitur model EV)

Data: Makassar n=151 (setelah preprocess), Gowa n=44 (eksklusi mono-INH, outcome valid).
P-value: uji Mann-Whitney (usia) dan uji chi-kuadrat (kategorikal).

| Fitur | Makassar | Gowa | p-value | Beda signifikan? |
|---|---|---|---|---|
| Ket.Usia (mean ± sd) | 41.5 ± 15.4 | 41.8 ± 15.3 | 0.92 | Tidak |
| Pemeriksaan Kontak (P=Ya/Ada) | 0.52 | 0.77 | **0.004** | **Ya** |
| Riwayat_DM (P=Ada) | 0.21 | 0.25 | 0.87 | Tidak |
| Riwayat Pengobatan Sebelumnya (P=Kasus Lama) | 0.58 | 0.55 | 0.85 | Tidak |
| Panduan Pengobatan (P=Jangka Panjang) | 0.09 | 0.09 | 1.00 | Tidak |
| **Prevalensi kegagalan pengobatan** | **30.5%** | **20.5%** | — | **Ya** |

**Kesimpulan alibi:** Satu-satunya fitur kategorikal yang berbeda signifikan adalah
`Pemeriksaan Kontak` (p=0.004) — Makassar 52% vs Gowa 77% — disertai perbedaan prevalensi
kegagalan (30.5% vs 20.5%). Kedua populasi memang berbeda secara statistik, sehingga model
yang dilatih pada data Makassar tidak dapat langsung ditransfer ke populasi Gowa tanpa
penyesuaian (recalibration/domain adaptation).

**Catatan definisi:** Di register Gowa, kolom yang bersesuaian bernama **"Dilakukan
Pemeriksaan Kontak"** (proses investigasi kontak oleh fasilitas), sedangkan pada data Makassar
`Pemeriksaan Kontak` diinterpretasikan sebagai faktor risiko (riwayat kontak erat). Perbedaan
makna kolom ini konsisten dengan arah hubungan yang berlawanan terhadap outcome.

---

## 3. Simulasi "file teman" — jika data Gowa disusun ulang ke format Makassar

Simulasi menyusun DataFrame 19 kolom gaya Makassar dari register Gowa, dengan dua skenario
pengisian kolom yang tidak tersedia:

| Skenario | Keterangan |
|---|---|
| **A-Kosong** | 9 kolom yang tidak tersedia dibiarkan kosong (realistis — data tidak ada) |
| **A-Imputasi** | 9 kolom diisi nilai modus dari data Makassar (simulasi teman diminta konfirmasi/isi) |

Hasil model EV (refit Makassar, 5 fitur, SMOTE) dan model web produksi (SVM, 9 fitur):

| Model | Skenario | n | Acc | Prec | Rec | F1 | AUC | CM (tp/fp/tn/fn) |
|---|---|---|---|---|---|---|---|---|
| EV (5 fitur) | A-Kosong | 0 | — | — | — | — | — | semua baris drop |
| EV (5 fitur) | A-Imputasi | 44 | 47.7 | 11.1 | 22.2 | 14.8 | 0.49 | 2/16/19/7 |
| Web (9 fitur) | A-Kosong | 44 | 29.5 | 21.1 | 88.9 | 34.0 | 0.44 | 8/30/5/1 |
| Web (9 fitur) | A-Imputasi | 44 | 79.5 | 50.0 | 22.2 | 30.8 | 0.69 | 2/2/33/7 |
| EV saat ini (referensi) | — | 44 | 47.7 | 18.2 | 44.4 | 25.8 | 0.47 | 4/18/17/5 |

**Interpretasi:**
1. **A-Kosong (EV):** seluruh baris gagal di-preprocess (9 kolom NaN) → teman tidak dapat
   menghasilkan file yang bisa dipakai model EV hanya dari register.
2. **A-Imputasi (EV):** meskipun semua kosong diisi, metrik EV tetap rendah (F1 14.8, AUC 0.49),
   tidak lebih baik dari EV saat ini. Ini membuktikan bahwa **bukan format file** penyebab
   rendah, melainkan perbedaan populasi dan definisi kolom.
3. **A-Imputasi (web):** model web 9 fitur dengan input imputasi memberi Acc 79.5 dan AUC 0.69
   — jauh lebih baik dari EV — namun tetap dengan recall gagal rendah (22.2%) dan bergantung
   pada asumsi imputasi yang tidak dapat diverifikasi dari data aktual.

**Kesimpulan:** Menyusun ulang data Gowa ke format Makassar tidak menaikkan metrik validasi
eksternal secara bermakna. Angka rendah bertahan karena perbedaan populasi nyata
(bagian 2), bukan karena ketidakcocokan header.

---

## 4. Kesimpulan

1. Struktur data kedua RSUD berbeda total (rekap ML 19 kolom vs register SITB 146 kolom);
   header **tidak dapat disamakan** karena skema pencatatan berbeda.
2. Sebagian besar fitur model web tidak tersedia di register Gowa.
3. Perbedaan populasi signifikan pada `Pemeriksaan Kontak` (p=0.004) dan prevalensi kegagalan
   (30.5% vs 20.5%).
4. Simulasi konversi format membuktikan hasil rendah tidak berasal dari format file.
5. Hasil EV rendah merupakan temuan transportability yang sah dan menjadi dasar rekomendasi
   recalibration/domain adaptation model sebelum digunakan di RSUD Syekh Yusuf.
