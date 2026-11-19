# Скачивает анкету клиента и его фото в папку Clients\<компания>\ рядом с проектом.
# Запуск:  powershell -ExecutionPolicy Bypass -File tools\get_brief.ps1            (последняя анкета)
#          powershell -ExecutionPolicy Bypass -File tools\get_brief.ps1 -Id <номер>
# Адрес Worker и ключ лежат в файле tools\bot.config.ps1 (в git не попадает).
param([string]$Id = '')

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$cfgPath = Join-Path $PSScriptRoot 'bot.config.ps1'
if (-not (Test-Path $cfgPath)) { throw "Нет файла $cfgPath (нужны переменные `$WorkerUrl и `$AdminKey)" }
. $cfgPath
$h = @{ 'X-Admin-Key' = $AdminKey }

if (-not $Id) {
  $list = Invoke-RestMethod -Uri "$WorkerUrl/admin/briefs" -Headers $h
  if (-not $list.briefs -or $list.briefs.Count -eq 0) { Write-Host 'Анкет пока нет.'; exit 0 }
  $Id = ($list.briefs | Sort-Object t -Descending | Select-Object -First 1).id
}

$b = (Invoke-RestMethod -Uri "$WorkerUrl/admin/brief/$Id" -Headers $h).brief
$name = ($b.answers.company -replace '[\\/:*?"<>|]', '_').Trim()
if (-not $name) { $name = $Id }
$dir = Join-Path $root "Clients\$name"
New-Item -ItemType Directory -Force -Path (Join-Path $dir 'photos') | Out-Null
[IO.File]::WriteAllText((Join-Path $dir 'brief.md'), $b.markdown, (New-Object Text.UTF8Encoding $false))

$n = 0
foreach ($p in $b.photos) {
  $ext = 'jpg'
  $tmp = Join-Path $dir ("photos\tmp_$n")
  $r = Invoke-WebRequest -Uri "$WorkerUrl/admin/file/$Id/$n" -Headers $h -OutFile $tmp -PassThru
  $fp = $r.Headers['X-File-Path']
  if ($fp -is [array]) { $fp = $fp[0] }
  if ($fp -match '\.(\w+)$') { $ext = $Matches[1] }
  $prefix = if ($p.k -eq 'logo') { 'logo' } else { 'photo' }
  Move-Item -Force $tmp (Join-Path $dir ("photos\{0}_{1:00}.{2}" -f $prefix, ($n + 1), $ext))
  $n++
}
Write-Host "Готово: $dir  (фото: $n)"
