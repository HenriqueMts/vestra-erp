# Script PowerShell para testar o webhook do Asaas localmente
# Uso: .\scripts\test-webhook.ps1 -CustomerId "cus_xxx" -EventType "PAYMENT_RECEIVED"

param(
    [Parameter(Mandatory=$false)]
    [string]$CustomerId,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE")]
    [string]$EventType = "PAYMENT_RECEIVED",
    
    [string]$Token = $env:ASAAS_WEBHOOK_TOKEN
)

# Se token não fornecido, usar padrão
if (-not $Token) {
    $Token = "GFRX604l0msDhqbZr0v9VoA6"
    Write-Host "⚠️  Usando token padrão. Configure ASAAS_WEBHOOK_TOKEN no .env.local" -ForegroundColor Yellow
}

# Verificar se CustomerId foi fornecido
if (-not $CustomerId) {
    Write-Host "❌ Erro: CustomerId é obrigatório" -ForegroundColor Red
    Write-Host ""
    Write-Host "Uso: .\scripts\test-webhook.ps1 -CustomerId 'cus_xxx' [-EventType 'PAYMENT_RECEIVED']" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para encontrar o Customer ID:" -ForegroundColor Cyan
    Write-Host "1. Acesse /minha-conta (como admin)" -ForegroundColor Cyan
    Write-Host "2. Veja a coluna 'Asaas Customer ID' na tabela" -ForegroundColor Cyan
    Write-Host "3. Copie o ID (ex: cus_xxxxx)" -ForegroundColor Cyan
    exit 1
}

$WebhookUrl = "http://localhost:3000/api/asaas/webhook"
$PaymentId = "pay_test_$(Get-Date -Format 'yyyyMMddHHmmss')"

# Montar payload baseado no tipo de evento
$DueDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
$PaymentDate = (Get-Date).ToString("yyyy-MM-dd")

if ($EventType -eq "PAYMENT_OVERDUE") {
    $DueDate = (Get-Date).AddDays(-5).ToString("yyyy-MM-dd")
    $PaymentDate = $null
}

$Payload = @{
    event = $EventType
    payment = @{
        id = $PaymentId
        customer = $CustomerId
        status = if ($EventType -eq "PAYMENT_OVERDUE") { "OVERDUE" } else { "RECEIVED" }
        value = 100.00
        dueDate = $DueDate
        paymentDate = $PaymentDate
    }
} | ConvertTo-Json -Depth 10

Write-Host "🚀 Testando webhook..." -ForegroundColor Green
Write-Host "URL: $WebhookUrl?token=$Token"
Write-Host "Evento: $EventType"
Write-Host "Customer: $CustomerId"
Write-Host ""

try {
    $Response = Invoke-RestMethod -Uri "$WebhookUrl?token=$Token" `
        -Method Post `
        -ContentType "application/json" `
        -Body $Payload `
        -ErrorAction Stop
    
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host "Resposta: $($Response | ConvertTo-Json -Depth 5)"
    
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Green
    Write-Host "1. Verifique os logs do servidor Next.js"
    Write-Host "2. Verifique o banco de dados"
    
    if ($EventType -eq "PAYMENT_OVERDUE") {
        Write-Host "3. Tente fazer login com um usuário dessa organização (deve ser bloqueado)"
    }
} catch {
    Write-Host "❌ Erro!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Mensagem: $($_.Exception.Message)"
    exit 1
}
