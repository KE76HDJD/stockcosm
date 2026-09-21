# Sauvegardes Neon → Google Drive

**Automatique chaque nuit 02:00 UTC** via GitHub Actions → Drive `StockCosM/backups`.

## Secrets GitHub requis
- `NEON_PASSWORD` = `npg_03jVtQCDNHzS`
- `BACKUP_PASSPHRASE` = `yaokouma-kevin` (AES256)
- `RCLONE_SA_JSON` = contenu du service account `stockcosm-backup@...iam.gserviceaccount.com`

## Manuel local
```bash
bash scripts/backup-neon.sh          # plain .sql + custom .dump
bash scripts/restore-neon.sh backups/stockcosm-...sql   # restaure plain
# Pour Drive chiffré :
gpg --symmetric --cipher-algo AES256 --passphrase "yaokouma-kevin" stockcosm-2026-09-22.dump
gpg -d stockcosm-2026-09-22.dump.gpg | pg_restore --clean ...
rclone copy stockcosm-2026-09-22.dump.gpg gdrive:StockCosM/backups/
```

## Drive
- Dossier partagé en **Éditeur** au service account.
- Rétention : GitHub 7j + Drive 7 quotidiens + 1 mensuel (suppression >30j manuelle pour l'instant).
- Test restore : télécharger `.gpg` → `gpg -d` → `pg_restore` sur branch `restore-test`.

## Vérif
- Actions → `Backup Neon vers Google Drive` vert
- Drive → `StockCosM/backups/stockcosm-YYYY-MM-DD.dump.gpg` présent
