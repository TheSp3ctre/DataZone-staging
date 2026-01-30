#!/bin/bash
set -e

# Configurar valores padrão
export PORT=${PORT:-8000}
export DEBUG=${DEBUG:-false}

echo "🚀 Iniciando DataZone Energy API..."
echo "Porta: $PORT"
echo "Ambiente: $ENVIRONMENT"

# Executar migrações (se necessário, descomente a linha abaixo)
# echo "🔄 Executando migrações..."
# python scripts/migrate.py

# Iniciar servidor Uvicorn
# --proxy-headers é importante quando atrás de um load balancer (como no Railway)
# --forwarded-allow-ips='*' confia nos headers do load balancer
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port $PORT \
    --proxy-headers \
    --forwarded-allow-ips='*' \
    --workers 4
