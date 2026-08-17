$ErrorActionPreference = 'Stop'

$partId = '16000000-0000-4000-8000-000000000024'
$sourcePath = (Resolve-Path 'Aptis\listenning\part 4\aptis_listening_part4_grouped_by_topic.json').Path
$sourceParent = (Resolve-Path (Split-Path $sourcePath -Parent)).Path
$tempDirectory = Join-Path $sourceParent '.repair-listening-part4-assets'
$containerTemp = '/tmp/listening-part4-repair'
$minioTarget = 'local/aptis-content/content/import/listening-part4-grouped'

function Clear-HostTemp {
    if (-not (Test-Path -LiteralPath $tempDirectory)) { return }
    $resolved = (Resolve-Path -LiteralPath $tempDirectory).Path
    if ([IO.Path]::GetDirectoryName($resolved) -ne $sourceParent) { throw 'Unsafe repair path.' }
    $item = Get-Item -LiteralPath $resolved -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Repair path is a reparse point.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}

$source = Get-Content -Raw -Encoding utf8 -LiteralPath $sourcePath | ConvertFrom-Json
$setIds = @(docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.question_sets WHERE part_id='$partId' ORDER BY code")
$mongoJson = docker exec aptis-mongo mongosh aptis --quiet --eval "EJSON.stringify(db.question_set_documents.find({partId:'$partId'}).toArray())"
$documents = $mongoJson | ConvertFrom-Json
if ($setIds.Count -ne 60 -or $documents.Count -ne 60) { throw 'Part 4 metadata is incomplete.' }
$documentById = @{}
$documents | ForEach-Object { $documentById[$_.questionSetId] = $_ }

Clear-HostTemp
New-Item -ItemType Directory -Path $tempDirectory | Out-Null
for ($index = 0; $index -lt 60; $index++) {
    $assetId = [string]$documentById[$setIds[$index]].assets[0].assetId
    if ([string]::IsNullOrWhiteSpace($assetId)) { throw "Missing asset at topic $($index + 1)." }
    $expectedHash = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT checksum_sha256 FROM aptis.assets WHERE id='$assetId'").Trim()
    $filePath = Join-Path $tempDirectory "$assetId.mp3"
    Write-Host "[$($index + 1)/60] Repairing $($source.topics[$index].topic)"
    Invoke-WebRequest -UseBasicParsing -Uri $source.topics[$index].audio_url -OutFile $filePath
    $actualHash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHash) { throw "Source checksum changed at topic $($index + 1)." }
}

docker exec aptis-minio rm -rf $containerTemp
docker cp $tempDirectory "aptis-minio:$containerTemp"
if ($LASTEXITCODE -ne 0) { throw 'Cannot copy repaired assets to MinIO container.' }
docker exec aptis-minio sh -c "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc mirror --overwrite --remove $containerTemp $minioTarget"
if ($LASTEXITCODE -ne 0) { throw 'Cannot synchronize repaired Part 4 assets.' }
docker exec aptis-minio rm -rf $containerTemp
Clear-HostTemp
Write-Host 'Repaired 60 Listening Part 4 asset objects.'
