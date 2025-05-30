# Stop any running Node.js processes
Write-Host "Stopping any running Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object { 
    try {
        $_.Kill()
        Write-Host "Stopped process $($_.Id)" -ForegroundColor Green
    } catch {
        Write-Host "Failed to stop process $($_.Id): $_" -ForegroundColor Red
    }
}

# Force clean the Next.js cache folder
Write-Host "Cleaning Next.js cache..." -ForegroundColor Yellow
if (Test-Path -Path ".next") {
    try {
        Get-ChildItem -Path ".next" -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        Remove-Item -Path ".next" -Force -Recurse -ErrorAction SilentlyContinue
        Write-Host "Successfully cleaned .next folder" -ForegroundColor Green
    } catch {
        Write-Host "Could not completely clean .next folder: $_" -ForegroundColor Red
    }
}

# Start the development server
Write-Host "Starting Next.js development server..." -ForegroundColor Yellow
npm run dev
