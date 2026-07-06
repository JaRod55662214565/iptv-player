#!/bin/bash
# Setup Web TV sur VPS/Azure (Debian/Ubuntu)
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Exécute en root : sudo bash setup-vps.sh"
  exit 1
fi

DOMAIN="${1:-1tr4ck.dpdns.org}"
TELEGRAM_BOT_TOKEN="${2:-$TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${3:-$TELEGRAM_CHAT_ID}"

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "Usage: sudo bash setup-vps.sh <domaine> <telegram_bot_token> <telegram_chat_id>"
  exit 1
fi

APP_DIR="/opt/webtv"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Installation Web TV — $DOMAIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Prérequis ─────────────────────────────────────────────
echo "📦 Installation des dépendances..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx nodejs openssl

# ─── 2. Copie des fichiers ────────────────────────────────────
echo "📂 Copie des fichiers vers $APP_DIR..."
mkdir -p "$APP_DIR"
cp -r dist/ "$APP_DIR/dist"
cp server.js start.sh "$APP_DIR/"
chmod +x "$APP_DIR/start.sh"

# ─── 3. Certificat SSL autosigné ──────────────────────────────
echo "🔐 Génération du certificat SSL autosigné..."
mkdir -p /etc/ssl/webtv
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/ssl/webtv/webtv-key.pem \
  -out /etc/ssl/webtv/webtv-cert.pem \
  -subj "/CN=$DOMAIN/O=WebTV/C=FR" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost" 2>/dev/null
chmod 600 /etc/ssl/webtv/webtv-key.pem

# ─── 4. Config nginx ──────────────────────────────────────────
echo "🔧 Configuration nginx..."
cp deploy/nginx.conf /etc/nginx/sites-available/webtv
sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/sites-available/webtv
ln -sf /etc/nginx/sites-available/webtv /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ─── 5. Tentative Let's Encrypt (si DNS déjà en place) ────────
echo "🌤️  Tentative SSL Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
  --email "admin@$(echo $DOMAIN | sed 's/^[^.]*\.//')" \
  --redirect 2>/dev/null && \
  echo "✅ Let's Encrypt OK" || \
  echo "   ⚡ Certificat autosigné actif (Let's Encrypt dispo plus tard)"

# ─── 6. Service systemd pour le relay Telegram ────────────────
echo "⚙️  Création du service systemd..."
cat > /etc/systemd/system/webtv-telegram.service << 'SERVICE'
[Unit]
Description=Web TV Telegram Relay
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/webtv
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/webtv/.env
User=nobody
Group=nogroup

[Install]
WantedBy=multi-user.target
SERVICE

echo "TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN" > "$APP_DIR/.env"
echo "TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID" >> "$APP_DIR/.env"
echo "PORT=3001" >> "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

systemctl daemon-reload
systemctl enable webtv-telegram
systemctl start webtv-telegram

# ─── 7. Firewall ──────────────────────────────────────────────
echo "🛡️  Configuration du firewall..."
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-service=ssh
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
else
  echo "   ⚠️  Aucun firewall détecté. Azure NSG : ouvre les ports 22, 80, 443"
fi

# ─── Vérification ─────────────────────────────────────────────
sleep 2
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Web TV installée sur $DOMAIN"
echo ""
echo "  🔗 https://$DOMAIN"
echo "  📡 Relay Telegram: http://127.0.0.1:3001"
echo ""
echo "  🔥 Ports à ouvrir sur Azure (NSG) :"
echo "     22/TCP  — SSH"
echo "     80/TCP  — HTTP (redirect → HTTPS)"
echo "     443/TCP — HTTPS (nginx + SSL)"
echo ""
echo "  📋 Commandes utiles :"
echo "     systemctl status webtv-telegram"
echo "     journalctl -u webtv-telegram -f"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
