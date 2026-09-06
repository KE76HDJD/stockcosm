import subprocess
import os
import re
from datetime import datetime
from pathlib import Path
from app.config import get_settings


SAFE_FILENAME_RE = re.compile(r"^backup_[a-z0-9_]+_\d{8}_\d{6}\.sql$")


class BackupService:

    @staticmethod
    def _get_dirs():
        settings = get_settings()
        backup_dir = Path(settings.BACKUP_DIR)
        backup_dir.mkdir(parents=True, exist_ok=True)
        return backup_dir

    @staticmethod
    def _get_db_env():
        settings = get_settings()
        return {**os.environ, "PGPASSWORD": settings.DB_PASSWORD}

    @staticmethod
    def _get_pg_args():
        settings = get_settings()
        return [
            f"--host={settings.DB_HOST}",
            f"--port={settings.DB_PORT}",
            f"--username={settings.DB_USER}",
            f"--dbname={settings.DB_NAME}",
            "--no-password",
        ]

    @staticmethod
    def _validate_filename(filename: str) -> Path:
        backup_dir = BackupService._get_dirs()

        if ".." in filename or "/" in filename or "\\" in filename:
            raise ValueError("Chemin non autorisé")

        if not SAFE_FILENAME_RE.match(filename):
            raise ValueError("Format de nom de fichier non autorisé")

        filepath = (backup_dir / filename).resolve()

        if not filepath.is_relative_to(backup_dir.resolve()):
            raise ValueError("Chemin hors du répertoire de backups")

        return filepath

    @staticmethod
    def create_backup(reason: str = "manual") -> dict:
        backup_dir = BackupService._get_dirs()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{reason}_{timestamp}.sql"
        filepath = backup_dir / filename

        result = subprocess.run(
            ["pg_dump", *BackupService._get_pg_args(), "--format=plain", f"--file={filepath}"],
            env=BackupService._get_db_env(),
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            raise Exception(f"Erreur pg_dump: {result.stderr}")

        size_bytes = filepath.stat().st_size
        return {
            "filename": filename,
            "filepath": str(filepath),
            "size_bytes": size_bytes,
            "reason": reason,
            "created_at": datetime.now().isoformat(),
        }

    @staticmethod
    def list_backups() -> list[dict]:
        backup_dir = BackupService._get_dirs()
        backups = []
        for f in sorted(backup_dir.glob("backup_*.sql"), reverse=True):
            backups.append({
                "filename": f.name,
                "filepath": str(f),
                "size_bytes": f.stat().st_size,
                "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
        return backups

    @staticmethod
    def restore_backup(filename: str) -> dict:
        filepath = BackupService._validate_filename(filename)

        if not filepath.exists():
            raise FileNotFoundError(f"Backup introuvable: {filename}")

        result = subprocess.run(
            ["psql", *BackupService._get_pg_args(), f"--file={filepath}"],
            env=BackupService._get_db_env(),
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            raise Exception(f"Erreur restauration: {result.stderr}")

        return {
            "restored_from": filename,
            "message": "Base restaurée avec succès",
        }

    @staticmethod
    def delete_backup(filename: str) -> dict:
        filepath = BackupService._validate_filename(filename)

        if not filepath.exists():
            raise FileNotFoundError(f"Backup introuvable: {filename}")
        filepath.unlink()
        return {"deleted": filename}
