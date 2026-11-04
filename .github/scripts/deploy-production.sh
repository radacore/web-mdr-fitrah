#!/usr/bin/env bash
#
# Deploy production MDR-TB.
#
# Skrip ini dijalankan di VPS oleh wrapper /usr/local/bin/mdrtb-deploy
# melalui forced command SSH dari GitHub Actions. Perintah SSH asli tersedia
# di SSH_ORIGINAL_COMMAND dan hanya dipakai untuk membedakan deploy biasa
# ("deploy") dengan paksa rebuild ("force").

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)}"
BRANCH="${BRANCH:-main}"
FORCE_REBUILD=0

case "${SSH_ORIGINAL_COMMAND:-}" in
    force)
        FORCE_REBUILD=1
        ;;
    deploy | "")
        ;;
    *)
        echo "!! Perintah SSH tidak dikenal: ${SSH_ORIGINAL_COMMAND}"
        exit 2
        ;;
esac

cd "$APP_DIR"

echo ">> Deploy $BRANCH di $APP_DIR"

# Jangan menimpa perubahan yang belum di-commit. Berkas deployment yang belum
# dilacak (docker-compose.yml, Dockerfile, rebuild.sh) sengaja diabaikan.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "!! Ada perubahan lokal yang belum di-commit di VPS:"
    git status --short --untracked-files=no
    echo "!! Deploy dibatalkan agar perubahan tidak tertimpa."
    exit 1
fi

if [ ! -x ./rebuild.sh ]; then
    echo "!! rebuild.sh tidak ditemukan atau tidak executable di $APP_DIR"
    exit 1
fi

BEFORE="$(git rev-parse HEAD)"
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"
AFTER="$(git rev-parse HEAD)"

CHANGED=""
if [ "$BEFORE" != "$AFTER" ]; then
    CHANGED="$(git diff --name-only "$BEFORE" "$AFTER")"
fi

echo ">> Commit: $BEFORE -> $AFTER"
if [ -n "$CHANGED" ]; then
    echo ">> Berkas berubah:"
    printf '%s\n' "$CHANGED" | sed 's/^/   /'
fi

APP=0
ML=0
INFRA=0

while IFS= read -r path; do
    [ -z "$path" ] && continue
    case "$path" in
        mdr-tb-prediction/*)
            APP=1
            ;;
        ml-service/*)
            ML=1
            ;;
        docker-compose.yml | rebuild.sh | mdr-tb-prediction/Dockerfile | mdr-tb-prediction/.dockerignore | mdr-tb-prediction/.docker/* | ml-service/Dockerfile | ml-service/.dockerignore)
            INFRA=1
            ;;
    esac
done <<< "$CHANGED"

# Perubahan pada compose/Dockerfile/rebuild.sh berarti kedua image perlu
# dibangun ulang agar konfigurasi baru benar-benar dipakai.
if [ "$INFRA" = "1" ]; then
    APP=1
    ML=1
fi

if [ "$FORCE_REBUILD" = "1" ]; then
    APP=1
fi

SERVICES=""
if [ "$APP" = "1" ]; then
    SERVICES="$SERVICES app"
fi
if [ "$ML" = "1" ]; then
    SERVICES="$SERVICES ml"
fi
SERVICES="${SERVICES# }"

if [ -z "$SERVICES" ]; then
    echo ">> Tidak ada perubahan pada app/ml; container tidak di-rebuild."
else
    echo ">> Rebuild:$SERVICES"
    if ! ./rebuild.sh $SERVICES; then
        echo "!! Build gagal. Mengembalikan container lama..."
        docker compose up -d || true
        exit 1
    fi
fi

wait_healthy() {
    local name="$1"
    local tries="${2:-36}"
    local status=""
    local i

    for ((i = 1; i <= tries; i++)); do
        status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || echo missing)"
        if [ "$status" = "healthy" ]; then
            echo "   $name: healthy"
            return 0
        fi
        if [ "$status" = "missing" ]; then
            break
        fi
        sleep 5
    done

    echo "!! $name tidak sehat (status: $status)"
    docker logs --tail 60 "$name" 2>&1 || true
    return 1
}

echo ">> Menunggu container sehat..."
wait_healthy mdrtb-app
wait_healthy mdrtb-ml
wait_healthy mdrtb-nginx
wait_healthy mdrtb-mysql

if ! MIGRATION_STATUS="$(docker exec mdrtb-app php artisan migrate:status 2>&1)"; then
    echo "!! Gagal membaca status migrasi:"
    printf '%s\n' "$MIGRATION_STATUS"
    exit 1
fi

if printf '%s\n' "$MIGRATION_STATUS" | grep -q "Pending"; then
    echo "!! Masih ada migrasi pending:"
    printf '%s\n' "$MIGRATION_STATUS" | tail -20
    exit 1
fi

echo ">> Cek endpoint /up"
docker exec mdrtb-nginx wget -qO- --header="Host: prediksimdrtb.web.id" http://127.0.0.1/up >/dev/null

echo ">> Deploy selesai: $(git log -1 --oneline)"
