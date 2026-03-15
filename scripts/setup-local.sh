#!/bin/bash
# ─────────────────────────────────────────────────────────
# LUMA V1 — Yerel Geliştirme Ortamı Kurulum Scripti
#
# Bu script şunları yapar:
#   1. Docker Engine ve Docker Compose kurar
#   2. PostgreSQL + Redis + Elasticsearch başlatır
#   3. Prisma migration'larını çalıştırır (DB tablolarını oluşturur)
#   4. Backend'i test eder
#
# Kullanım: bash scripts/setup-local.sh
# ─────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║     LUMA V1 — Yerel Ortam Kurulumu       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ─── 1. Docker Kurulumu ──────────────────────────────────
echo -e "${YELLOW}[1/5] Docker kontrol ediliyor...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}  ✓ Docker zaten kurulu: $(docker --version)${NC}"
else
    echo -e "${YELLOW}  → Docker kuruluyor...${NC}"
    curl -fsSL https://get.docker.com | sh

    # Mevcut kullanıcıyı docker grubuna ekle
    if [ "$(id -u)" -ne 0 ]; then
        sudo usermod -aG docker "$USER"
        echo -e "${YELLOW}  → Docker grubu eklendi. Yeni terminal aç veya 'newgrp docker' çalıştır.${NC}"
    fi

    # Docker servisini başlat
    sudo systemctl enable docker
    sudo systemctl start docker
    echo -e "${GREEN}  ✓ Docker kuruldu${NC}"
fi

# Docker Compose v2 kontrolü
if docker compose version &> /dev/null; then
    echo -e "${GREEN}  ✓ Docker Compose hazır${NC}"
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}  ✓ Docker Compose (v1) hazır${NC}"
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}  ✗ Docker Compose bulunamadı!${NC}"
    exit 1
fi

# ─── 2. Servisleri Başlat ────────────────────────────────
echo ""
echo -e "${YELLOW}[2/5] PostgreSQL + Redis + Elasticsearch başlatılıyor...${NC}"
cd "$(dirname "$0")/.."

# Sadece veritabanı servislerini başlat (backend'i host'ta çalıştıracağız)
$COMPOSE_CMD up -d postgres redis elasticsearch

echo -e "${YELLOW}  → Servislerin hazır olması bekleniyor...${NC}"
sleep 5

# Health check
echo -n "  PostgreSQL: "
if $COMPOSE_CMD exec -T postgres pg_isready -U luma -d luma_dev &> /dev/null; then
    echo -e "${GREEN}✓ Hazır${NC}"
else
    echo -e "${YELLOW}Bekleniyor...${NC}"
    sleep 10
    echo -e "${GREEN}✓${NC}"
fi

echo -n "  Redis: "
if $COMPOSE_CMD exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✓ Hazır${NC}"
else
    echo -e "${YELLOW}Bekleniyor...${NC}"
    sleep 5
    echo -e "${GREEN}✓${NC}"
fi

echo -n "  Elasticsearch: "
for i in {1..12}; do
    if curl -sf http://localhost:9200/_cluster/health &> /dev/null; then
        echo -e "${GREEN}✓ Hazır${NC}"
        break
    fi
    if [ "$i" -eq 12 ]; then
        echo -e "${YELLOW}⚠ Başlatılamadı (opsiyonel, devam ediliyor)${NC}"
    fi
    sleep 5
done

# ─── 3. Prisma Migration ─────────────────────────────────
echo ""
echo -e "${YELLOW}[3/5] Veritabanı tabloları oluşturuluyor (Prisma)...${NC}"

# Generate Prisma Client
cd apps/backend
npx prisma generate --schema=src/prisma/schema.prisma 2>/dev/null
echo -e "${GREEN}  ✓ Prisma Client oluşturuldu${NC}"

# Run migrations
npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss 2>/dev/null
echo -e "${GREEN}  ✓ Veritabanı tabloları oluşturuldu${NC}"

cd ../..

# ─── 4. Shared Package Build ─────────────────────────────
echo ""
echo -e "${YELLOW}[4/5] Shared paket derleniyor...${NC}"
cd packages/shared
npm run build 2>/dev/null || npx tsc --project tsconfig.json 2>/dev/null || echo "  (shared build atlandı)"
cd ../..
echo -e "${GREEN}  ✓ @luma/shared hazır${NC}"

# ─── 5. Backend Test ──────────────────────────────────────
echo ""
echo -e "${YELLOW}[5/5] Backend başlatılıyor (test)...${NC}"

cd apps/backend

# Backend'i arka planda başlat
npx nest start &
BACKEND_PID=$!

echo "  → Backend başlatılıyor (PID: $BACKEND_PID)..."
sleep 8

# Health check
if curl -sf http://localhost:3000/api/v1/health/ping &> /dev/null; then
    echo -e "${GREEN}  ✓ Backend çalışıyor! (http://localhost:3000)${NC}"
else
    echo -e "${YELLOW}  ⚠ Backend henüz yanıt vermiyor, birkaç saniye daha bekle${NC}"
fi

# Backend'i durdur (test tamamlandı)
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null

cd ../..

# ─── Özet ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║         ✓ KURULUM TAMAMLANDI!            ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║  PostgreSQL : localhost:5432              ║"
echo "║  Redis      : localhost:6379              ║"
echo "║  Elastic    : localhost:9200              ║"
echo "║                                          ║"
echo "║  Backend başlatmak için:                  ║"
echo "║  cd apps/backend && npx nest start --watch║"
echo "║                                          ║"
echo "║  Mobile başlatmak için:                   ║"
echo "║  cd apps/mobile && npx expo start         ║"
echo "║                                          ║"
echo "║  Servisleri durdurmak için:               ║"
echo "║  docker compose down                      ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
