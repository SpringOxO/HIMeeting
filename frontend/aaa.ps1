# reinstall-vue-cli.ps1
Write-Host "🚀 开始清理并重装 Vue CLI..." -ForegroundColor Cyan

$npmGlobalBin = "$env:APPDATA\npm"
$vueCmdPath = "$npmGlobalBin\vue.cmd"
$vuePs1Path = "$npmGlobalBin\vue.ps1"

# 1. 删除旧版 vue 脚本
if (Test-Path $vueCmdPath) {
    Write-Host "🗑️  删除旧文件: $vueCmdPath" -ForegroundColor Yellow
    Remove-Item $vueCmdPath -Force
}
if (Test-Path $vuePs1Path) {
    Write-Host "🗑️  删除旧文件: $vuePs1Path" -ForegroundColor Yellow
    Remove-Item $vuePs1Path -Force
}

# 2. 清理 npm 缓存（带重试）
Write-Host "🧹 清理 npm 缓存..." -ForegroundColor Cyan
try {
    npm cache clean --force
    Write-Host "✅ npm 缓存清理成功。" -ForegroundColor Green
} catch {
    Write-Host "⚠️  npm 缓存清理失败（可忽略，继续安装）: $_" -ForegroundColor Red
}

# 3. 重新安装 @vue/cli
Write-Host "📥 正在全局安装 @vue/cli..." -ForegroundColor Cyan
npm install -g @vue/cli

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 安装失败。请检查网络或手动运行：npm install -g @vue/cli" -ForegroundColor Red
    exit 1
}

# 4. 验证安装
Write-Host "🔍 验证 Vue CLI 版本..." -ForegroundColor Cyan
vue --version

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Vue CLI 安装成功！" -ForegroundColor Green
    Write-Host "📌 你可以使用以下命令创建新项目：" -ForegroundColor Cyan
    Write-Host "   vue create my-project" -ForegroundColor Magenta
} else {
    Write-Host "⚠️  无法验证 Vue CLI，请检查 PATH 或重启终端。" -ForegroundColor Yellow
}