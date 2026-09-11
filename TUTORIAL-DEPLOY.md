# Tutorial Deploy - MDR-TB Prediction System

Alur deploy untuk project `~/ml-mdr` di VPS.

---

## 1. Masuk VPS

```bash
ssh root@IP_VPS
cd ~/ml-mdr
```

Cek posisi folder:

```bash
pwd
ls
```

Pastikan ada:

```
docker-compose.yml
mdr-tb-prediction/
ml-service/
```

---

## 2. Cek Status Git

Sebelum pull, cek apakah ada perubahan lokal:

```bash
git status
```

Kalau ada perubahan lokal yang tidak penting:

```bash
git checkout -- path/file-yang-berubah
```

Contoh yang kemarin:

```bash
git checkout -- ml-service/app.py
```

Kalau perubahan lokal mau disimpan dulu:

```bash
git stash
```

---

## 3. Pull Kode Terbaru

```bash
git pull origin main
```

Kalau berhasil, lanjut.

Kalau ada error seperti:

```
Your local changes would be overwritten by merge
```

Lihat dulu:

```bash
git diff
```

Kalau boleh dibuang:

```bash
git checkout -- nama-file
git pull origin main
```

---

## 4. Set Konfigurasi `.env` Laravel

Buka `.env` Laravel:

```bash
nano ~/ml-mdr/mdr-tb-prediction/.env
```

Pastikan domain benar:

```env
APP_URL=https://sripredict.web.id
ASSET_URL=
```

Pastikan ML service benar untuk Docker:

```env
ML_SERVICE_URL=http://mdr_ml:500
```

Pastikan database benar:

```env
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=mdr_prediction
DB_USERNAME=root
DB_PASSWORD=ROOT_PDI-P_Admin_Secure!
```

Tambahkan timeout Octane:

```env
OCTANE_MAX_EXECUTION_TIME=600
```

Simpan nano: `Ctrl+O` > `Enter` > `Ctrl+X`

---

## 5. Buat Fix Octane Permanen

Supaya `max_execution_time` tidak balik ke 30 setelah rebuild.

Buka Dockerfile app:

```bash
nano ~/ml-mdr/mdr-tb-prediction/Dockerfile
```

Cari bagian ini:

```dockerfile
RUN php artisan octane:install --server=frankenphp
```

Tambahkan tepat setelahnya:

```dockerfile
RUN sed -i "s/'max_execution_time' => 30/'max_execution_time' => env('OCTANE_MAX_EXECUTION_TIME', 600)/" config/octane.php
```

Pastikan bagian bawah Dockerfile kurang lebih seperti ini:

```dockerfile
RUN composer require laravel/octane

RUN php artisan octane:install --server=frankenphp

RUN sed -i "s/'max_execution_time' => 30/'max_execution_time' => env('OCTANE_MAX_EXECUTION_TIME', 600)/" config/octane.php

CMD ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=800"]
```

Simpan nano: `Ctrl+O` > `Enter` > `Ctrl+X`

---

## 6. Cek `docker-compose.yml`

Buka compose:

```bash
nano ~/ml-mdr/docker-compose.yml
```

Pastikan service `app` punya environment ini:

```yaml
- APP_ENV=production
- OCTANE_SERVER=frankenphp
- OCTANE_MAX_EXECUTION_TIME=600
- ML_SERVICE_URL=http://mdr_ml:500
```

Pastikan service ML punya:

```yaml
- LARAVEL_API_URL=http://mdr_app:800/api
```

Simpan kalau ada perubahan.

---

## 7. Rebuild Container

Kalau ada perubahan kode Laravel/React/Dockerfile:

```bash
cd ~/ml-mdr
docker compose up -d --build app ml_service
```

Kalau hanya restart tanpa rebuild:

```bash
docker compose restart app ml_service
```

> Redis tidak perlu direstart kecuali ada masalah Redis.

---

## 8. Clear Cache Laravel

Setelah container jalan:

```bash
docker exec -it mdr_app php artisan optimize:clear
docker exec -it mdr_app php artisan config:clear
docker exec -it mdr_app php artisan route:clear
docker exec -it mdr_app php artisan view:clear
```

Restart app:

```bash
docker compose restart app
```

---

## 9. Verifikasi Container

Cek container berjalan:

```bash
docker compose ps
```

Atau:

```bash
docker ps
```

Harus ada:

```
mdr_app
mdr_ml
mdr_redis
```

---

## 10. Verifikasi Octane Timeout

Cek nilai Octane:

```bash
docker exec -it mdr_app php artisan tinker
```

Lalu ketik:

```php
config('octane.max_execution_time')
```

Hasil harus: `600`

Keluar:

```php
exit
```

> Kalau masih 30, berarti fix Dockerfile belum masuk atau container belum rebuild benar.

---

## 11. Verifikasi Koneksi App ke ML

Dari container Laravel:

```bash
docker exec -it mdr_app curl -i http://mdr_ml:500/health
```

Harus mendapat response JSON dari ML service.

Cek env Laravel:

```bash
docker exec -it mdr_app printenv | grep ML_SERVICE_URL
```

Harus:

```
ML_SERVICE_URL=http://mdr_ml:500
```

Cek env ML:

```bash
docker exec -it mdr_ml printenv | grep LARAVEL_API_URL
```

Harus:

```
LARAVEL_API_URL=http://mdr_app:800/api
```

---

## 12. Verifikasi Asset Domain

Kalau halaman putih atau asset error, cek:

```bash
docker exec -it mdr_app printenv | grep -E 'APP_URL|ASSET_URL'
```

Pastikan tidak ada domain lama (`mdr.pdiperjuangansulsel.id`).

Kalau masih ada domain lama: edit `.env` > clear cache > restart app.

---

## 13. Nginx Proxy Manager

Di Nginx Proxy Manager untuk `sripredict.web.id`:

| Setting | Nilai |
|---------|-------|
| Forward Hostname/IP | `mdr_app` |
| Forward Port | `800` |
| Scheme | `http` |
| Websockets Support | ON |
| Block Common Exploits | ON |
| SSL | Aktif |
| Force SSL | ON |
| HTTP/2 Support | ON |

Di tab **Advanced**, isi:

```nginx
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
send_timeout 600s;
```

Setelah save, restart NPM kalau perlu:

```bash
docker restart simoka_npm
```

---

## 14. Cloudflare

Untuk domain `sripredict.web.id`:

| Setting | Nilai |
|---------|-------|
| DNS record | A ke IP VPS |
| Proxy status | Proxied atau DNS only |
| SSL/TLS mode | Full atau Full (strict) |

> Kalau muncul error SSL 525, biasanya masalah SSL antara Cloudflare dan Nginx Proxy Manager.
> Untuk test tanpa Cloudflare, set sementara DNS record jadi **DNS only**.

---

## 15. Test Endpoint Web

Test dari laptop atau VPS:

```bash
curl -i https://sripredict.web.id
```

Test API retrain:

```bash
curl -i -X POST https://sripredict.web.id/api/retrain \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"use_smote":false}'
```

Kalau mau test langsung ke app tanpa Cloudflare/NPM:

```bash
curl -i -X POST http://IP_VPS:8002/api/retrain \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"use_smote":false}'
```

---

## 16. Cek Log Saat Ada Error

Log Laravel app:

```bash
docker logs -f mdr_app
```

Log file Laravel:

```bash
docker exec -it mdr_app tail -f storage/logs/laravel.log
```

Log ML:

```bash
docker logs -f mdr_ml
```

Cek resource:

```bash
docker stats mdr_app mdr_ml
```

---

## 17. Deploy Rutin (Ke Depan)

Setiap ada update baru dari GitHub:

```bash
cd ~/ml-mdr
git status
git pull origin main
docker compose up -d --build app ml_service
docker exec -it mdr_app php artisan optimize:clear
docker compose restart app
docker compose ps
```

Lalu verifikasi:

```bash
docker exec -it mdr_app php artisan tinker
```

```php
config('octane.max_execution_time')
// Harus: 600
exit
```

---

## 18. Jika Hanya Ubah `.env`

Kalau cuma ubah `.env`, tidak wajib rebuild:

```bash
docker exec -it mdr_app php artisan optimize:clear
docker compose restart app
```

Kalau env dari `docker-compose.yml` berubah, recreate:

```bash
docker compose up -d app
```

---

## 19. Jika Tombol Retrain Error Lagi

Cek dulu timeout Octane:

```bash
docker exec -it mdr_app php artisan tinker
```

```php
config('octane.max_execution_time')
```

- Kalau balik ke **30** = container baru dibuat tanpa fix permanen. Ulangi bagian Dockerfile (langkah 5) dan rebuild.
- Kalau sudah **600**, cek log:

```bash
docker exec -it mdr_app tail -n 120 storage/logs/laravel.log
docker logs --tail=120 mdr_ml
```

---

## 20. Catatan Penting

- Jangan commit file `.env` ke GitHub.
- Jangan commit `__pycache__/`, `logs/`, atau file cache.
- Kalau fix Dockerfile sudah benar dan ingin permanen di repo, commit file:
  - `mdr-tb-prediction/Dockerfile`
  - `docker-compose.yml` (kalau compose juga berubah)
