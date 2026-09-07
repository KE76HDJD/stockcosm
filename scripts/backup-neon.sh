#!/bin/bash
# Backup Neon DB — exécuter avant chaque changement de code
# Usage: bash scripts/backup-neon.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERREUR: Fichier $ENV_FILE introuvable."
  exit 1
fi

source "$ENV_FILE"

if [ -z "$NEON_PASSWORD" ]; then
  echo "ERREUR: NEON_PASSWORD non défini dans $ENV_FILE"
  exit 1
fi

BACKUP_DIR="/home/kevin/Gestion_stock/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="$BACKUP_DIR/stockcosm-$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "Backup Neon DB → $BACKUP_FILE"

docker run --rm -e PGPASSWORD="$NEON_PASSWORD" postgres:18 pg_dump \
  -h ep-billowing-star-aycvpit0-pooler.c-5.us-east-2.aws.neon.tech \
  -p 5432 \
  -U neondb_owner \
  -d neondb \
  -F p \
  --no-owner \
  --no-privileges \
  --no-comments \
  > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "OK — $SIZE — $(wc -l < "$BACKUP_FILE") lignes"
