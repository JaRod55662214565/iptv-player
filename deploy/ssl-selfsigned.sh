#!/bin/bash
# Génère un certificat SSL autosigné (fallback si Let's Encrypt échoue)
set -e

DOMAIN="${1:-1tr4ck.dpdns.org}"
OUT_DIR="/etc/ssl/webtv"

mkdir -p "$OUT_DIR"

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$OUT_DIR/webtv-key.pem" \
  -out "$OUT_DIR/webtv-cert.pem" \
  -subj "/CN=$DOMAIN/O=WebTV/C=FR" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost"

chmod 600 "$OUT_DIR/webtv-key.pem"
echo "✅ Certificat autosigné créé : $OUT_DIR"
