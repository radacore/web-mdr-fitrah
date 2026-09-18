<?php

namespace App\Providers;

use App\Services\MlServiceClient;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Konfigurasi layanan ML dibaca dari config/ml.php, bukan langsung dari env,
        // agar tetap benar setelah perintah config:cache dijalankan.
        $this->app->singleton(MlServiceClient::class, fn () => MlServiceClient::make());
    }

    public function boot(): void
    {
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);
    }
}
