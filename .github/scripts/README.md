# Deploy production

Alur otomatis:

1. Push ke branch `main` (atau jalankan workflow secara manual).
2. GitHub Actions SSH ke VPS memakai key khusus.
3. Key dibatasi dengan `command="/usr/local/bin/mdrtb-deploy"`, sehingga hanya
   bisa menjalankan wrapper deploy, bukan shell bebas.
4. Wrapper menyalin `deploy-production.sh` dari repo lalu menjalankannya.
5. Skrip melakukan `git pull --ff-only`, mendeteksi perubahan pada
   `mdr-tb-prediction/` atau `ml-service/`, lalu memanggil `rebuild.sh`.
6. Setelah build, skrip menunggu container sehat, memeriksa migrasi pending,
   dan menguji endpoint `/up`.

## Secrets yang dibutuhkan

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_KEY`
- `VPS_KNOWN_HOSTS`

## Catatan

- Berkas deployment di VPS (`docker-compose.yml`, `Dockerfile`, `.docker/`,
  `rebuild.sh`) belum masuk Git. Skrip memakai `rebuild.sh` yang sudah ada.
- Deploy biasa tidak menyentuh container jika tidak ada perubahan pada
  `mdr-tb-prediction/` atau `ml-service/`.
- `workflow_dispatch` dengan `force_rebuild: true` memaksa rebuild app.
