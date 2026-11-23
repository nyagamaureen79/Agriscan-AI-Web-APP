# Load all .env variables into session
Get-Content .\.env | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    Write-Host "[ENV] Set $key"
}

Write-Host "[START] All env vars loaded. Starting server..."
uvicorn app.main:app --reload
