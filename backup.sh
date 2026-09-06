#!/bin/bash
# Sauvegarde automatique de la base de données StockCosm
# Usage: ./backup.sh (manuel) ou via cron

set -e

REPERTOIRE="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$REPERTOIRE/backups"
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="$BACKUP_DIR/stockcosm_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Début de la sauvegarde..."

PGPASSWORD=yaokouma pg_dump \
  -h localhost \
  -p 5435 \
  -U postgres \
  -d gestion_stock_cosmetiques \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[backup] Terminé : $BACKUP_FILE ($FILESIZE)"

# Garder les 30 dernières sauvegardes
cd "$BACKUP_DIR"
ls -1t stockcosm_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
REMAINING=$(ls -1 stockcosm_*.sql.gz 2>/dev/null | wc -l)
echo "[backup] $REMAINING sauvegardes conservées"
