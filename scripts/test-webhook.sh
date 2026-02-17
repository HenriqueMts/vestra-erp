#!/bin/bash

# Script para testar o webhook do Asaas localmente
# Uso: ./scripts/test-webhook.sh [PAYMENT_RECEIVED|PAYMENT_OVERDUE]

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
WEBHOOK_URL="http://localhost:3000/api/asaas/webhook"
TOKEN="${ASAAS_WEBHOOK_TOKEN:-GFRX604l0msDhqbZr0v9VoA6}"
EVENT_TYPE="${1:-PAYMENT_RECEIVED}"

# Verificar se o token está configurado
if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Erro: ASAAS_WEBHOOK_TOKEN não configurado${NC}"
  echo "Configure no .env.local ou passe como variável de ambiente"
  exit 1
fi

# Solicitar customer ID se não fornecido
if [ -z "$CUSTOMER_ID" ]; then
  echo -e "${YELLOW}⚠️  Você precisa fornecer o asaasCustomerId de uma organização${NC}"
  echo "Exemplo: CUSTOMER_ID=cus_xxx ./scripts/test-webhook.sh"
  echo ""
  echo "Para encontrar o customer ID:"
  echo "1. Acesse /minha-conta (como admin)"
  echo "2. Veja a coluna 'Asaas Customer ID' na tabela"
  exit 1
fi

# Montar payload baseado no tipo de evento
if [ "$EVENT_TYPE" = "PAYMENT_RECEIVED" ] || [ "$EVENT_TYPE" = "PAYMENT_CONFIRMED" ]; then
  PAYLOAD=$(cat <<EOF
{
  "event": "$EVENT_TYPE",
  "payment": {
    "id": "pay_test_$(date +%s)",
    "customer": "$CUSTOMER_ID",
    "status": "RECEIVED",
    "value": 100.00,
    "dueDate": "$(date -d '+3 days' +%Y-%m-%d 2>/dev/null || date -v+3d +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)",
    "paymentDate": "$(date +%Y-%m-%d)"
  }
}
EOF
)
elif [ "$EVENT_TYPE" = "PAYMENT_OVERDUE" ]; then
  PAYLOAD=$(cat <<EOF
{
  "event": "PAYMENT_OVERDUE",
  "payment": {
    "id": "pay_test_$(date +%s)",
    "customer": "$CUSTOMER_ID",
    "status": "OVERDUE",
    "value": 100.00,
    "dueDate": "$(date -d '-5 days' +%Y-%m-%d 2>/dev/null || date -v-5d +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)"
  }
}
EOF
)
else
  echo -e "${RED}❌ Tipo de evento inválido: $EVENT_TYPE${NC}"
  echo "Use: PAYMENT_RECEIVED, PAYMENT_CONFIRMED ou PAYMENT_OVERDUE"
  exit 1
fi

echo -e "${GREEN}🚀 Testando webhook...${NC}"
echo "URL: $WEBHOOK_URL?token=$TOKEN"
echo "Evento: $EVENT_TYPE"
echo "Customer: $CUSTOMER_ID"
echo ""

# Enviar requisição
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Separar body e status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Verificar resposta
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Sucesso! (HTTP $HTTP_CODE)${NC}"
  echo "Resposta: $BODY"
else
  echo -e "${RED}❌ Erro! (HTTP $HTTP_CODE)${NC}"
  echo "Resposta: $BODY"
  exit 1
fi

echo ""
echo -e "${GREEN}📋 Próximos passos:${NC}"
echo "1. Verifique os logs do servidor Next.js"
echo "2. Verifique o banco de dados: SELECT billing_status FROM organizations WHERE asaas_customer_id = '$CUSTOMER_ID';"
if [ "$EVENT_TYPE" = "PAYMENT_OVERDUE" ]; then
  echo "3. Tente fazer login com um usuário dessa organização (deve ser bloqueado)"
fi
