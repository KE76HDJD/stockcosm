import logging
from datetime import datetime, timezone

logger = logging.getLogger("stockcosm.audit")


def log_event(action: str, user_id: str, details: str = "", success: bool = True):
    timestamp = datetime.now(timezone.utc).isoformat()
    status = "OK" if success else "FAIL"
    logger.info(
        "[%s] %s | user=%s | status=%s | %s",
        timestamp,
        action,
        user_id,
        status,
        details,
    )


def log_login(user_id: str, success: bool, details: str = ""):
    log_event("LOGIN", user_id, details, success)


def log_stock_change(action: str, user_id: str, produit_id: str, details: str = ""):
    log_event(action, user_id, f"produit={produit_id} {details}")


def log_sale(action: str, user_id: str, vente_id: str, details: str = ""):
    log_event(action, user_id, f"vente={vente_id} {details}")


def log_user_management(action: str, admin_id: str, target: str, details: str = ""):
    log_event(action, admin_id, f"target={target} {details}")
