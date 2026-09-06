#!/bin/bash
set -e

REPERTOIRE="$(cd "$(dirname "$0")" && pwd)"
REPERTOIRE_PID="$REPERTOIRE/.pids"

echo "=== Arrêt des services StockCosm ==="

# Cloudflare Tunnel
if [ -f "$REPERTOIRE_PID/cloudflared.pid" ]; then
  PID=$(cat "$REPERTOIRE_PID/cloudflared.pid")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "[cloudflared] Arrêté (PID $PID)"
  else
    echo "[cloudflared] Déjà arrêté"
  fi
  rm -f "$REPERTOIRE_PID/cloudflared.pid"
else
  echo "[cloudflared] Aucun PID trouvé"
fi

# Caddy
if [ -f "$REPERTOIRE_PID/caddy.pid" ]; then
  PID=$(cat "$REPERTOIRE_PID/caddy.pid")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "[caddy] Arrêté (PID $PID)"
  else
    echo "[caddy] Déjà arrêté"
  fi
  rm -f "$REPERTOIRE_PID/caddy.pid"
else
  echo "[caddy] Aucun PID trouvé"
fi

# Backend
if [ -f "$REPERTOIRE_PID/backend.pid" ]; then
  PID=$(cat "$REPERTOIRE_PID/backend.pid")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "[backend] Arrêté (PID $PID)"
  else
    echo "[backend] Déjà arrêté"
  fi
  rm -f "$REPERTOIRE_PID/backend.pid"
else
  echo "[backend] Aucun PID trouvé"
fi

# Nettoyer les processus restants sur les ports
for PORT in 8024 8443; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    echo "[port $PORT] Nettoyé"
  fi
done

echo "=== Arrêt terminé ==="
