<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Layanan Machine Learning
    |--------------------------------------------------------------------------
    |
    | Alamat layanan Python (Flask) yang menjalankan model Random Forest.
    | Nilai dibaca melalui config agar tetap benar setelah `config:cache`.
    |
    */

    'url' => env('ML_SERVICE_URL', 'http://localhost:5000'),

    // Batas waktu permintaan prediksi (detik)
    'timeout' => env('ML_SERVICE_TIMEOUT', 30),

    // Pelatihan ulang memerlukan waktu lebih panjang karena grid search
    'timeout_training' => env('ML_SERVICE_TIMEOUT_TRAINING', 300),

    // Skenario pengujian melatih beberapa konfigurasi model sekaligus
    'timeout_scenario' => env('ML_SERVICE_TIMEOUT_SCENARIO', 600),

];
