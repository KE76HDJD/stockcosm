#!/bin/bash
# Restaurer un backup Neon DB
# Usage: bash scripts/restore-neon.sh backups/stockcosm-2026-09-07_15-30.sql

set -e

if [ -z "$1" ]; then
  echo "Usage: bash scripts/restore-neon.sh <fichier.sql>"
  echo "Backups disponibles:"
  ls -la /home/kevin/Gestion_stock/backups/*.sql 2>/dev/null || echo "  Aucun"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Fichier introuvable: $BACKUP_FILE"
  exit 1
fi

echo "ATTENTION: Ceci va ÉCRASER la base Neon."
read -p "Continuer? (y/N) " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && exit 0

echo "Reset schema..."
docker run --rm -e PGPASSWORD="REDACTED" postgres:18 psql \
  -h ep-billowing-star-aycvpit0-pooler.c-5.us-east-2.aws.neon.tech \
  -U neondb_owner -d neondb \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO neondb_owner;"

echo "Restauration de $BACKUP_FILE..."
docker run --rm -e PGPASSWORD="REDACTED" -v "$(dirname $(realpath $BACKUP_FILE)):/data" postgres:18 psql \
  -h ep-billowing-star-aycvpit0-pooler.c-5.us-east-2.aws.neon.tech \
  -U neondb_owner -d neondb \
  -f "/data/$(basename $BACKUP_FILE)"

echo "OK — Base restaurée."
