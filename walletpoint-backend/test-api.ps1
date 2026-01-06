# WalletPoint API Test Script
# Jalankan setelah password diupdate di database

Write-Host "=== WalletPoint API Test ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000/api/v1"

# 1. Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    Write-Host "   Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# 2. Login as Mahasiswa
Write-Host "2. Login as Mahasiswa..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "mahasiswa@walletpoint.edu"
        password = "admin123"
        role = "mahasiswa"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $token = $login.data.tokens.access_token
    Write-Host "   User: $($login.data.user.name)" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Pastikan password sudah diupdate di database!" -ForegroundColor Yellow
    exit
}
Write-Host ""

# 3. Get Wallet
Write-Host "3. Get Wallet..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $wallet = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method Get -Headers $headers
    Write-Host "   Balance: Rp $($wallet.data.wallet.balance)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# 4. Get Transactions
Write-Host "4. Get Transactions..." -ForegroundColor Yellow
try {
    $tx = Invoke-RestMethod -Uri "$baseUrl/wallet/transactions" -Method Get -Headers $headers
    Write-Host "   Total: $($tx.meta.total) transactions" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# 5. Get Products
Write-Host "5. Get Products..." -ForegroundColor Yellow
try {
    $products = Invoke-RestMethod -Uri "$baseUrl/products" -Method Get
    Write-Host "   Total: $($products.meta.total) products" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# 6. Get Missions
Write-Host "6. Get Missions..." -ForegroundColor Yellow
try {
    $missions = Invoke-RestMethod -Uri "$baseUrl/missions" -Method Get
    Write-Host "   Total: $($missions.meta.total) missions" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# 7. Login as Dosen
Write-Host "7. Login as Dosen..." -ForegroundColor Yellow
try {
    $dosenBody = @{
        email = "dosen@walletpoint.edu"
        password = "admin123"
        role = "dosen"
    } | ConvertTo-Json
    
    $dosenLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $dosenBody
    $dosenToken = $dosenLogin.data.tokens.access_token
    Write-Host "   User: $($dosenLogin.data.user.name)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# 8. Generate QR (Dosen only)
Write-Host "8. Generate QR Code (Dosen)..." -ForegroundColor Yellow
try {
    $dosenHeaders = @{ Authorization = "Bearer $dosenToken" }
    $qrBody = @{
        amount = 5000
        description = "Test Payment"
    } | ConvertTo-Json
    
    $qr = Invoke-RestMethod -Uri "$baseUrl/qr/generate" -Method Post -ContentType "application/json" -Body $qrBody -Headers $dosenHeaders
    Write-Host "   QR Code: $($qr.data.qr_code.code)" -ForegroundColor Green
    Write-Host "   Amount: Rp $($qr.data.qr_code.amount)" -ForegroundColor Green
    $qrCode = $qr.data.qr_code.code
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# 9. Scan QR (Mahasiswa)
Write-Host "9. Scan QR Code (Mahasiswa)..." -ForegroundColor Yellow
try {
    $scanBody = @{
        qr_code = $qrCode
    } | ConvertTo-Json
    
    $mahasiswaHeaders = @{ Authorization = "Bearer $token" }
    $scan = Invoke-RestMethod -Uri "$baseUrl/qr/scan" -Method Post -ContentType "application/json" -Body $scanBody -Headers $mahasiswaHeaders
    Write-Host "   Transaction: $($scan.data.transaction.transaction_id)" -ForegroundColor Green
    Write-Host "   Status: $($scan.data.transaction.status)" -ForegroundColor Green
    Write-Host "   New Balance: Rp $($scan.data.transaction.balance_after)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 10. Get Me
Write-Host "10. Get Current User..." -ForegroundColor Yellow
try {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $mahasiswaHeaders
    Write-Host "   Name: $($me.data.user.name)" -ForegroundColor Green
    Write-Host "   Email: $($me.data.user.email)" -ForegroundColor Green
    Write-Host "   Role: $($me.data.user.role)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
