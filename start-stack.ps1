param(
  [string]$ApiHost = "0.0.0.0",
  [int]$ApiPort = 8000,
  [int]$FrontendPort = 4173,
  [int]$WsPort = 8090
)

Write-Host "Starting OpenClaw stack..."

function Test-PortInUse {
  param([int]$Port)
  $line = netstat -ano | Select-String ":$Port\s+.*LISTENING"
  return $null -ne $line
}

if (-not (Test-PortInUse -Port $ApiPort)) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\server_new\OSPanel\home\openclaw.ru\backend'; php artisan serve --host=$ApiHost --port=$ApiPort"
} else {
  Write-Host "API port $ApiPort already in use, skipping start."
}

if (-not (Test-PortInUse -Port $FrontendPort)) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\server_new\OSPanel\home\openclaw.ru\frontend'; npm run build; npm run preview -- --host 0.0.0.0 --port $FrontendPort"
} else {
  Write-Host "Frontend port $FrontendPort already in use, skipping start."
}

if (-not (Test-PortInUse -Port $WsPort)) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\server_new\OSPanel\home\openclaw.ru\ws-gateway'; `$env:WS_PORT='$WsPort'; node server.js"
} else {
  Write-Host "WS port $WsPort already in use, skipping start."
}

Write-Host "Started:"
Write-Host "  API:      http://localhost:$ApiPort"
Write-Host "  Frontend: http://localhost:$FrontendPort"
Write-Host "  WS:       ws://localhost:$WsPort"
