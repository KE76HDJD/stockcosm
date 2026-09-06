#!/bin/bash
set -e

REPERTOIRE="$(cd "$(dirname "$0")" && pwd)"
REPERTOIRE_BACKEND="$REPERTOIRE/backend"
REPERTOIRE_FRONTEND="$REPERTOIRE/frontend"
REPERTOIRE_PID="$REPERTOIRE/.pids"
REPERTOIRE_LOG="$REPERTOIRE/logs"
CADDY_BIN="$REPERTOIRE/caddy"
CADDYFILE="$REPERTOIRE/Caddyfile"
CLOUDFLARED_BIN="$REPERTOIRE/cloudflared"

mkdir -p "$REPERTOIRE_PID" "$REPERTOIRE_LOG"

# Arrêter les anciens processus d'abord
bash "$REPERTOIRE/stop.sh"

echo ""
echo "=== Démarrage StockCosm (Production) ==="

# ── 1. PostgreSQL (Docker) ──────────────────────────────────────────────
echo "[db] Vérification PostgreSQL..."
if docker ps --format '{{.Names}}' | grep -q gestion_stock_db; then
  echo "[db] PostgreSQL déjà en cours d'exécution"
else
  echo "[db] Démarrage PostgreSQL..."
  cd "$REPERTOIRE"
  docker compose up -d
  sleep 3
fi

# ── 2. Backend (uvicorn production) ─────────────────────────────────────
echo "[backend] Démarrage en cours..."
cd "$REPERTOIRE_BACKEND"
source venv/bin/activate
nohup python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8024 \
  --workers 2 \
  > "$REPERTOIRE_LOG/backend.log" 2>&1 &
echo $! > "$REPERTOIRE_PID/backend.pid"
echo "[backend] PID $(cat "$REPERTOIRE_PID/backend.pid") — http://localhost:8024"

# Attendre que le backend soit prêt
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://localhost:8024/health > /dev/null 2>&1; then
    echo "[backend] Prêt !"
    break
  fi
  sleep 1
done

# ── 3. Frontend (build statique si nécessaire) ──────────────────────────
echo "[frontend] Vérification du build..."
if [ ! -d "$REPERTOIRE_FRONTEND/dist" ] || [ "$REPERTOIRE_FRONTEND/src" -nt "$REPERTOIRE_FRONTEND/dist" ]; then
  echo "[frontend] Build en cours..."
  cd "$REPERTOIRE_FRONTEND"
  npm run build 2>&1 | tail -3
  echo "[frontend] Build terminé"
else
  echo "[frontend] Build existant OK"
fi

# ── 4. Caddy (reverse proxy + static server) ────────────────────────────
if [ -x "$CADDY_BIN" ]; then
  echo "[caddy] Démarrage en cours..."
  cd "$REPERTOIRE"
  nohup setsid "$CADDY_BIN" run --config "$CADDYFILE" --adapter caddyfile < /dev/null \
    > "$REPERTOIRE_LOG/caddy.log" 2>&1 &
  echo $! > "$REPERTOIRE_PID/caddy.pid"
  echo "[caddy] PID $(cat "$REPERTOIRE_PID/caddy.pid") — http://localhost:8443"
  sleep 2
  if curl -s --max-time 3 http://localhost:8443/ > /dev/null 2>&1; then
    echo "[caddy] Prêt !"
  else
    echo "[caddy] Démarré (vérifiez http://localhost:8443)"
  fi
else
  echo "[caddy] Binaire non trouvé, ignoré"
fi

# ── 5. Cloudflare Tunnel (accès à distance) ─────────────────────────────
if [ -x "$CLOUDFLARED_BIN" ]; then
  echo "[cloudflared] Démarrage du tunnel..."
  nohup setsid "$CLOUDFLARED_BIN" tunnel --url http://localhost:8443 < /dev/null \
    > "$REPERTOIRE_LOG/cloudflared.log" 2>&1 &
  echo $! > "$REPERTOIRE_PID/cloudflared.pid"
  echo "[cloudflared] PID $(cat "$REPERTOIRE_PID/cloudflared.pid")"
  sleep 5
  # Extraire l'URL du tunnel depuis les logs
  TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$REPERTOIRE_LOG/cloudflared.log" | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    echo "[cloudflared] URL publique : $TUNNEL_URL"
    echo "$TUNNEL_URL" > "$REPERTOIRE_LOG/tunnel_url.txt"
  else
    echo "[cloudflared] Tunnel démarré, URL dans logs/cloudflared.log"
  fi
else
  echo "[cloudflared] Binaire non trouvé, ignoré (accès local uniquement)"
fi

echo ""
echo "=== Services démarrés ==="
echo "  Backend    : http://localhost:8024  (PID $(cat "$REPERTOIRE_PID/backend.pid"))"
echo "  Caddy      : http://localhost:8443  (PID $(cat "$REPERTOIRE_PID/caddy.pid"))"
if [ -f "$REPERTOIRE_PID/cloudflared.pid" ]; then
  echo "  Tunnel     : $(cat "$REPERTOIRE_LOG/tunnel_url.txt" 2>/dev/null || echo 'voir logs/cloudflared.log')"
fi
echo "  Logs       : $REPERTOIRE_LOG/"
echo ""
echo "  Pour arrêter : ./stop.sh"
