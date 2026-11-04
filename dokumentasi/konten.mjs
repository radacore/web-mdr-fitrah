/**
 * konten.mjs — isi dokumentasi sebagai data.
 *
 * Setiap objek menghasilkan satu halaman A4. Untuk mengubah narasi, cukup
 * sunting berkas ini lalu jalankan `npm run build`; tidak perlu menulis HTML.
 *
 * Markah teks:
 *   **tebal**     → <strong>
 *   *miring*      → <em>
 *   `kode`        → <span class="path">
 *
 * `rasio` harus sama dengan tinggi tangkapan layar di capture.mjs:
 *   810 px = 16 / 9, 900 px = 16 / 10, 1080 px = 4 / 3 (lebar 1440 px).
 */

export const halaman = [
    {
        slug: 'login',
        judul: 'Halaman Login',
        modul: 'Autentikasi',
        shot: 'login',
        rasio: '16 / 9',
        caption:
            'Antarmuka login: panel informasi sistem di kiri, formulir masuk dan kartu akun demo di kanan.',
        subjudul:
            'Gerbang masuk sistem. Seluruh fitur hanya dapat diakses setelah pengguna terautentikasi, karena data yang diproses merupakan data rekam medis.',
        fungsi:
            'Memverifikasi identitas pengguna sebelum masuk ke sistem, lalu mengarahkan ke Dashboard sesuai peran akun: admin atau tenaga medis. Panel kiri menampilkan ringkasan sistem — 17 variabel klinis, teknik SMOTE, dan validasi 5-*fold*.',
        inti: 'login adalah lapisan pertama kendali akses sebelum data pasien dapat dibuka.',
        poin: [
            '**Tidak ada pendaftaran mandiri.** Akun hanya dibuat admin, sejalan dengan perlindungan data pribadi (UU No. 27 Tahun 2022).',
            'Kata sandi tidak pernah disimpan sebagai teks biasa; model `User` melakukan *hashing* otomatis.',
            'Kotak *Akun Demo* hanya alat bantu demonstrasi dan wajib dihapus sebelum aplikasi dipakai di lingkungan nyata.',
            'Percobaan berulang dibatasi untuk mengurangi risiko tebak kata sandi.',
        ],
    },
    {
        slug: 'dashboard',
        judul: 'Halaman Dashboard',
        modul: 'Navigasi',
        shot: 'dashboard',
        rasio: '4 / 3',
        caption:
            'Dashboard admin: tujuh kartu menu, badge peran, dan penjelasan singkat sistem di bagian bawah.',
        subjudul:
            'Halaman pertama setelah login. Menampilkan sapaan, peran pengguna, dan kartu menu yang tersedia — daftar menu menyesuaikan hak akses.',
        fungsi:
            'Pusat navigasi: pengguna melihat ringkasan sistem dan memilih fitur yang akan dijalankan. Tampilan berbeda antara admin dan tenaga medis karena daftar menu disaring berdasarkan peran.',
        inti: 'hak akses diterapkan dua kali — pada tampilan dan pada rute peladen.',
        poin: [
            '**Dua lapis kendali akses:** menu disembunyikan di tampilan, dan rute ditolak di peladen oleh *middleware* `admin` dengan kode `403`.',
            'Tenaga medis melihat 4 menu; admin melihat 7 menu.',
            'Setiap kartu menu memuat judul, keterangan singkat, dan tombol *Buka*.',
            'Menu dikelompokkan pada sidebar menjadi Utama, Evaluasi, dan Administrasi.',
        ],
    },
    {
        slug: 'klasifikasi',
        judul: 'Fitur Utama: Formulir Klasifikasi',
        modul: 'Klasifikasi',
        shot: 'klasifikasi',
        rasio: '4 / 3',
        caption:
            'Formulir terisi: kategori usia, durasi, dan status pengobatan tampil sebagai hasil hitung otomatis, bukan isian pengguna.',
        subjudul:
            'Inti sistem. Tenaga medis memasukkan data pasien dan tanggal awal pengobatan, sistem menghitung variabel turunan, lalu mengirim 17 variabel penelitian ke layanan *machine learning*.',
        fungsi:
            'Mengumpulkan 17 variabel prediktor dari rekam medis pasien, ditambah tanggal awal pengobatan sebagai metadata, lalu mengirimkannya ke model Random Forest untuk memperoleh label *Berhasil* atau *Tidak Berhasil* beserta probabilitasnya.',
        inti: 'IMT, kategori usia, durasi, dan status pengobatan dihitung sistem agar data masukan konsisten; tanggal pengobatan tidak ikut dikirim ke model.',
        poin: [
            '**Nama pasien tidak dikirim ke model** — hanya penanda internal.',
            'Tanggal awal pengobatan **wajib** pada klasifikasi baru. Durasi dihitung sampai hari ini, lalu status ditentukan: kurang dari 6 bulan pengobatan baru, 6 bulan atau lebih pengobatan lama.',
            'Validasi kategori memakai aturan yang sama dengan data latih (`TrainingData::aturanKategorik`), sehingga nilai selalu dikenali model.',
            'Hasil bukan keputusan akhir: keputusan klinis tetap pada tenaga medis.',
        ],
    },
    {
        slug: 'hasil',
        judul: 'Hasil Klasifikasi',
        modul: 'Klasifikasi',
        shot: 'hasil',
        rasio: '4 / 3',
        caption:
            'Hasil klasifikasi: label Tidak Berhasil dengan keyakinan 94,20%, probabilitas tiap kelas, dan rekomendasi tindakan berprioritas.',
        subjudul:
            'Keluaran utama sistem. Setelah formulir dikirim, halaman ini menampilkan label prediksi, tingkat keyakinan, probabilitas tiap kelas, dan rekomendasi tindakan klinis yang bisa langsung dibaca tenaga medis.',
        fungsi:
            'Menyajikan hasil klasifikasi secara utuh: label, tingkat keyakinan, probabilitas tiap kelas, rekomendasi tindakan berprioritas, data pasien lengkap dengan tanggal awal, durasi, dan status pengobatan, serta sepuluh variabel paling berpengaruh.',
        inti: 'model hanya memberi label dan probabilitas; sistem menambahkan penalaran tindakan agar pasien berisiko tidak lolos dari perhatian.',
        poin: [
            'Contoh pada gambar: **Tidak Berhasil 94,20%** (probabilitas *Berhasil* 5,80%), risiko **Tinggi**, tujuh faktor risiko.',
            'Blok **Informasi Pengobatan** menampilkan tanggal awal, durasi, dan status sebagai potret saat klasifikasi — bukan variabel model.',
            '*Feature importance* menjelaskan variabel paling berpengaruh pada model, bukan sebab pada satu pasien.',
            'Hasil adalah alat bantu; keputusan klinis akhir tetap pada tenaga medis.',
        ],
    },
    {
        slug: 'riwayat',
        judul: 'Riwayat Klasifikasi',
        modul: 'Riwayat',
        shot: 'riwayat',
        rasio: '16 / 10',
        caption:
            'Daftar riwayat: identitas pasien beserta durasi dan status pengobatan, hasil, keyakinan, penginput, waktu, dan aksi; filter hasil di kanan atas.',
        subjudul:
            'Arsip seluruh klasifikasi yang pernah dijalankan. Admin melihat semua riwayat, sedangkan tenaga medis hanya melihat riwayat yang ia buat sendiri.',
        fungsi:
            'Menampilkan daftar hasil klasifikasi secara ringkas agar dapat ditelusuri kembali, dibandingkan, atau dibuka detailnya. Tabel memuat identitas pasien, durasi dan status pengobatan, label hasil, keyakinan, penginput, dan waktu.',
        inti: 'pembatasan akses riwayat diterapkan pada kueri basis data, sehingga tenaga medis tidak mungkin melihat data pasien milik pengguna lain.',
        poin: [
            'Nama pasien bersifat opsional. Bila dikosongkan, tabel menampilkan **slug** seperti `P-WsCsLG` sebagai penanda internal.',
            'Durasi dan status pengobatan berasal dari potret saat klasifikasi, sehingga riwayat lama tidak berubah ketika tanggal berjalan.',
            'Badge hasil membedakan warna: *Berhasil* netral, *Tidak Berhasil* merah, agar pasien berisiko mudah dikenali.',
            'Kolom *Diinput oleh* hanya muncul untuk admin, sesuai kebutuhan audit lintas pengguna.',
            'Penyaringan data dilakukan di peladen, bukan dengan menyembunyikan baris di tampilan.',
        ],
    },
    {
        slug: 'riwayat-detail',
        judul: 'Detail Riwayat Klasifikasi',
        modul: 'Riwayat',
        shot: 'riwayat-detail',
        rasio: '4 / 3',
        caption:
            'Detail klasifikasi: waktu, model, penginput, kartu hasil, rekomendasi tindakan berprioritas, dan tombol hapus.',
        subjudul:
            'Membuka satu catatan klasifikasi secara lengkap, termasuk data masukan yang tersimpan. Halaman ini juga menjadi tempat menghapus riwayat.',
        fungsi:
            'Menyajikan kembali satu hasil klasifikasi secara utuh: waktu, model, penginput, label dan probabilitas, rekomendasi klinis, seluruh nilai variabel yang dimasukkan, informasi pengobatan, dan variabel paling berpengaruh.',
        inti: 'data rekam medis dilindungi sampai tingkat baris — mengetahui ID catatan tidak cukup untuk membukanya.',
        poin: [
            'Ada dua lapis pengamanan: *middleware* `auth` untuk semua rute, dan pemeriksaan kepemilikan data di tingkat controller.',
            'Tanggal awal, durasi, dan status pengobatan dibaca dari `patient_data`, bukan dihitung ulang, agar tetap sesuai kondisi saat klasifikasi.',
            'Penghapusan bersifat permanen, karena itu wajib melewati dialog konfirmasi.',
            'Rekomendasi disusun ulang dari data pasien saat halaman dibuka, sehingga tetap konsisten meski aturan diperbarui.',
        ],
    },
    {
        slug: 'evaluasi',
        judul: 'Evaluasi Model',
        modul: 'Evaluasi',
        shot: 'evaluasi',
        rasio: '4 / 3',
        caption:
            'Evaluasi model: metrik data uji, confusion matrix 2×2, distribusi kelas, penyeimbangan SMOTE, dan kualitas data.',
        subjudul:
            'Bukti kuantitatif performa Random Forest pada data uji, sekaligus penjelasan mengapa *recall* dijadikan metrik utama penelitian.',
        fungsi:
            'Menampilkan hasil evaluasi model yang sedang digunakan: empat metrik utama, *confusion matrix*, distribusi kelas, pengaruh SMOTE, validasi silang lima lipatan, dan kontribusi setiap variabel.',
        inti: 'recall diberi label *fokus* karena biaya klinis terbesar bukan salah menandai pasien berhasil, melainkan melewatkan pasien yang berisiko gagal.',
        poin: [
            'Kelas positif adalah **Tidak Berhasil**, sehingga *false negative* — pasien gagal yang diprediksi berhasil — adalah kesalahan yang paling dihindari.',
            'SMOTE hanya diterapkan pada data latih; data uji tetap memakai distribusi asli agar evaluasi tidak bias.',
            'Angka 100% pada data uji perlu dibaca hati-hati karena hanya 35 sampel; validasi silang memberi gambaran stabilitas yang lebih jujur.',
            'Kartu *Pembagian dan Kualitas Data* membandingkan distribusi basis data dengan data bersih yang dilaporkan layanan ML.',
        ],
    },
    {
        slug: 'smote',
        judul: 'Pengujian Efektivitas SMOTE',
        modul: 'Evaluasi',
        shot: 'smote',
        rasio: '4 / 3',
        caption:
            'Pengujian SMOTE: kesimpulan otomatis, tabel perbandingan metrik data uji, dan tabel validasi silang lima lipatan.',
        subjudul:
            'Membuktikan kontribusi SMOTE secara empiris: dua model dilatih pada data yang sama, satu tanpa SMOTE dan satu dengan SMOTE, lalu hasilnya dibandingkan.',
        fungsi:
            'Menjawab pertanyaan penelitian: apakah SMOTE benar-benar meningkatkan kemampuan model mendeteksi kelas minoritas? Selisih *recall* menjadi bukti utamanya.',
        inti: 'SMOTE terbukti meningkatkan recall pada data uji, tetapi efeknya pada dataset kecil tidak selalu seragam di semua metrik — karena itu kedua tabel ditampilkan.',
        poin: [
            'Acuan kesimpulan adalah **data uji**, karena data ini belum pernah dilihat model saat pelatihan.',
            'Kenaikan recall 9,09 poin berarti satu pasien berisiko gagal berhasil diselamatkan dari ketidakterdeteksian.',
            'Hasil validasi silang justru sedikit menurun. Ini ditampilkan apa adanya agar penilaian tidak sepihak dan tetap jujur secara ilmiah.',
            'Kesimpulan pada kartu atas disusun otomatis dari selisih metrik, bukan ditulis manual.',
        ],
    },
    {
        slug: 'skenario',
        judul: 'Skenario Pengujian',
        modul: 'Evaluasi',
        shot: 'skenario',
        rasio: '4 / 3',
        caption:
            'Skenario pengujian: kartu proporsi dan jumlah pohon terbaik, tabel variasi pembagian data, dan tabel variasi n_estimators.',
        subjudul:
            'Menguji kestabilan model terhadap dua hal: proporsi pembagian data dan jumlah pohon pada Random Forest. Tujuannya menemukan konfigurasi terbaik sekaligus menghindari *overfitting*.',
        fungsi:
            'Menyajikan hasil dua skenario pengujian beserta konfigurasi terbaiknya: proporsi pembagian data 80:20 dan jumlah pohon 100, masing-masing dipilih berdasarkan F1-score pada data uji.',
        inti: 'pemilihan hyperparameter dilakukan berdasarkan bukti pada data uji, bukan tebakan, dan selalu disertai pemeriksaan selisih latih–uji.',
        poin: [
            'Konfigurasi terpilih: **80:20** dan **100 pohon**, keduanya dengan selisih F1 latih–uji 0,00%.',
            'Mayoritas konfigurasi memberi hasil hampir sama, yang menandakan model cukup stabil pada dataset ini.',
            'Menambah pohon di atas 100 tidak menaikkan F1, sehingga 100 dipilih agar model lebih ringan.',
            'Pengujian melatih ulang model berkali-kali dan memakan waktu, karena itu dibatasi untuk admin.',
        ],
    },
    {
        slug: 'data-rekam-medis',
        judul: 'Data Rekam Medis',
        modul: 'Administrasi',
        shot: 'data-rekam-medis',
        rasio: '16 / 10',
        caption:
            'Data rekam medis: statistik dataset 175 baris, rasio ketidakseimbangan 2,24:1, tabel data, dan tombol Latih Ulang Model.',
        subjudul:
            'Pusat pengelolaan dataset penelitian. Admin dapat menambah, mengubah, dan menghapus baris data, memeriksa kualitas data, serta melatih ulang model.',
        fungsi:
            'Menampilkan seluruh data rekam medis yang dipakai sebagai data latih, lengkap dengan statistik kelas dan rasio ketidakseimbangan. Dari sini admin juga memicu pelatihan ulang model.',
        inti: 'model bukan berkas statis — ia mengikuti dataset. Perubahan data wajib diikuti pelatihan ulang agar evaluasi dan klasifikasi tetap selaras.',
        poin: [
            'Rasio 2,24:1 menunjukkan kelas tidak seimbang, dan inilah alasan SMOTE digunakan.',
            'Setiap penambahan atau perubahan data mengubah model, sehingga **latih ulang** diperlukan agar hasil klasifikasi konsisten.',
            'IMT dan kategori usia tidak diisi manual; keduanya dihitung ulang saat data disimpan.',
            'Tanggal awal pengobatan bersifat opsional pada data lama, sehingga 175 baris tetap dapat disunting tanpa melengkapi tanggal yang tidak tercatat.',
            'Aksi per baris: lihat detail, ubah, dan hapus dengan konfirmasi.',
        ],
    },
    {
        slug: 'data-form',
        judul: 'Formulir Data Rekam Medis',
        modul: 'Administrasi',
        shot: 'data-form',
        rasio: '4 / 3',
        caption:
            'Formulir tambah data: kategori usia, IMT, durasi, dan status pengobatan tampil sebagai kotak hasil hitung otomatis.',
        subjudul:
            'Digunakan admin untuk menambah atau mengubah satu baris dataset penelitian. Lima belas variabel diisi, dua variabel dihitung sistem, dan satu label keberhasilan pengobatan ditetapkan.',
        fungsi:
            'Mengumpulkan data rekam medis baru secara terstruktur. Formulir dibagi empat kelompok agar pengisian mengikuti alur pemeriksaan: Data Demografis, Kondisi Fisik, Riwayat Kesehatan, dan Data Pengobatan.',
        inti: 'variabel turunan dihitung sistem agar tidak mungkin terjadi pencatatan yang bertentangan, misalnya usia 48 tahun tercatat sebagai usia produktif.',
        poin: [
            'Hanya 15 isian aktif; kategori usia dan IMT tidak dapat dimanipulasi sehingga data selalu konsisten dengan definisi penelitian.',
            'Tanggal awal pengobatan **opsional** di sini agar data lama tetap dapat disunting; bila diisi, durasi dan status pengobatan langsung dihitung.',
            '*Keterangan efek samping* berupa teks bebas dan tidak dipakai sebagai fitur model, hanya catatan klinis.',
            'Label *Keberhasilan Pengobatan* hanya ada di data latih; data harus lengkap agar tidak dikecualikan pada tahap pembersihan.',
        ],
    },
    {
        slug: 'pembersihan',
        judul: 'Pembersihan Data',
        modul: 'Administrasi',
        shot: 'pembersihan',
        rasio: '16 / 10',
        caption:
            'Pembersihan data: ringkasan 175 data awal dan 175 data bersih, tanpa nilai hilang maupun duplikat, serta daftar kolom wajib.',
        subjudul:
            'Menampilkan hasil pemeriksaan kualitas dataset sebelum dipakai melatih model: berapa baris dibuang karena nilai kosong dan berapa karena duplikat.',
        fungsi:
            'Menjadi bukti bahwa tahap *data cleaning* benar-benar dijalankan dan dapat diaudit. Halaman menampilkan ringkasan empat angka kunci serta rincian setiap baris yang dikecualikan.',
        inti: 'kualitas data diperiksa secara eksplisit dan dapat ditelusuri, bukan diasumsikan bersih.',
        poin: [
            'Pada dataset penelitian: **175 → 175**, artinya 0 nilai hilang dan 0 duplikat, sehingga seluruh data layak dipakai.',
            'Halaman ini *tidak* menghapus data dari basis data; ia hanya menampilkan baris yang akan dikecualikan saat pelatihan.',
            'Daftar kolom wajib ditampilkan agar kriteria pemeriksaan transparan dan dapat diverifikasi dosen.',
            'Bila ada baris dibuang, tabel rincian mencantumkan alasan dan ID pembanding untuk duplikat.',
        ],
    },
    {
        slug: 'akun',
        judul: 'Manajemen Akun',
        modul: 'Administrasi',
        shot: 'akun',
        rasio: '16 / 10',
        caption:
            'Manajemen akun: statistik total akun, tabel nama–email–peran, dan aksi ubah atau hapus untuk setiap akun.',
        subjudul:
            'Satu-satunya tempat pembuatan akun. Admin mengelola akun admin dan tenaga medis; tidak ada pendaftaran mandiri karena data yang diproses bersifat rahasia.',
        fungsi:
            'Mengatur siapa yang boleh masuk ke sistem dan dengan peran apa. Setiap akun memiliki satu peran yang menentukan menu dan rute yang dapat diakses.',
        inti: 'akun dibuat terpusat oleh admin, dan aturan pengaman mencegah sistem terkunci tanpa pengelola.',
        poin: [
            '**Admin terakhir** tidak dapat diturunkan perannya atau dihapus, agar sistem tidak kehilangan pengelola.',
            'Akun yang sedang digunakan tidak dapat menghapus dirinya sendiri.',
            'Contoh dataset awal: 2 akun — satu admin dan satu tenaga medis.',
            'Tidak ada registrasi publik, sejalan dengan perlindungan data pribadi (UU No. 27 Tahun 2022).',
        ],
    },
    {
        slug: 'profil',
        judul: 'Profil Pengguna',
        modul: 'Akun',
        shot: 'profil',
        rasio: '16 / 10',
        caption:
            'Profil: badge peran, formulir informasi akun, dan formulir ubah kata sandi dengan ketentuan minimal delapan karakter.',
        subjudul:
            'Setiap pengguna dapat memperbarui namanya, alamat email, dan kata sandinya sendiri tanpa perlu bantuan admin.',
        fungsi:
            'Memberi kendali terbatas kepada pengguna atas identitas akunnya sendiri. Halaman terdiri atas dua formulir terpisah: *Informasi Akun* dan *Ubah Kata Sandi*.',
        inti: 'hak mengubah data dibatasi pada milik sendiri, sedangkan penetapan peran tetap berada di tangan admin.',
        poin: [
            'Berbeda dari *Manajemen Akun*: di sini pengguna mengubah dirinya sendiri, bukan akun orang lain.',
            'Email harus tetap unik; sistem menolak email yang sudah dipakai akun lain.',
            'Peran tidak dapat diubah dari halaman ini — hanya admin yang berwenang menetapkan peran.',
            'Kata sandi lama wajib benar sebelum kata sandi baru disimpan, sebagai pengaman tambahan.',
        ],
    },
];
