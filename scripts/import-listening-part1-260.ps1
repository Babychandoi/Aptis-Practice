[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\listenning\part 1\aptis_listening_part1_260_questions.json',
    [switch]$KeepDownloads
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$downloadDirectory = Join-Path (Split-Path -Parent $SourceFile) '.import-listening-part1-260'
$partId = '16000000-0000-4000-8000-000000000021'
$taskTypeId = '12000000-0000-4000-8000-000000000001'
$taskTypeCode = 'SINGLE_CHOICE'
$bucket = 'aptis-content'
$objectPrefix = 'content/import/listening-part1-260'
$adminEmail = 'plat-admin@test.local'

function Escape-Sql([string]$Value) {
    return $Value.Replace("'", "''")
}

function Invoke-MySql([string[]]$SqlLines) {
    $SqlLines | docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
}

if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) {
    throw "Không tìm thấy file nguồn: $SourceFile"
}

$items = @(Get-Content -LiteralPath $SourceFile -Raw -Encoding utf8 | ConvertFrom-Json | ForEach-Object { $_ })
if ($items.Count -ne 260) { throw "Expected 260 questions, found $($items.Count)." }
if (($items.'Question ID' | Select-Object -Unique).Count -ne $items.Count) { throw 'Question ID is not unique.' }
if (($items.'Audio URL' | Select-Object -Unique).Count -ne $items.Count) { throw 'Audio URL is not unique.' }
if (@($items | Where-Object { $_.'Đáp án (A/B/C)' -notin @('A', 'B', 'C') }).Count -gt 0) {
    throw 'One or more rows have an invalid A/B/C answer.'
}

$adminId = (docker exec aptis-mysql mysql -uaptis -paptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Không tìm thấy admin $adminEmail" }

$existingPart = (docker exec aptis-mysql mysql -uaptis -paptis -N -s -e "SELECT COUNT(*) FROM aptis.parts WHERE id='$partId'").Trim()
if ($existingPart -ne '1') { throw "Không tìm thấy Listening Part 1 ($partId)." }

if (Test-Path -LiteralPath $downloadDirectory) {
    $resolvedSourceDirectory = (Resolve-Path -LiteralPath (Split-Path -Parent $SourceFile)).Path
    $resolvedDownloadDirectory = (Resolve-Path -LiteralPath $downloadDirectory).Path
    if (-not $resolvedDownloadDirectory.StartsWith($resolvedSourceDirectory, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clear download directory outside source folder: $resolvedDownloadDirectory"
    }
    Remove-Item -LiteralPath $resolvedDownloadDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $downloadDirectory | Out-Null

$records = [System.Collections.Generic.List[object]]::new()
$counter = 0
foreach ($item in $items) {
    $counter++
    $questionSetId = [guid]::NewGuid().ToString()
    $assetId = [guid]::NewGuid().ToString()
    $audioUri = [Uri]$item.'Audio URL'
    $originalFilename = [IO.Path]::GetFileName($audioUri.AbsolutePath)
    $localFilename = "$assetId.mp3"
    $localPath = Join-Path $downloadDirectory $localFilename

    Write-Host "[$counter/$($items.Count)] Downloading $originalFilename"
    $downloaded = $false
    for ($attempt = 1; $attempt -le 3 -and -not $downloaded; $attempt++) {
        try {
            Invoke-WebRequest -Uri $item.'Audio URL' -OutFile $localPath -UseBasicParsing
            if ((Get-Item -LiteralPath $localPath).Length -le 0) { throw 'Empty audio file.' }
            $downloaded = $true
        } catch {
            if (Test-Path -LiteralPath $localPath) { Remove-Item -LiteralPath $localPath -Force }
            if ($attempt -eq 3) { throw "Không tải được audio cho STT $($item.STT): $($_.Exception.Message)" }
            Start-Sleep -Seconds ($attempt * 2)
        }
    }

    $records.Add([PSCustomObject]@{
        Sequence = [int]$item.STT
        SourceQuestionId = [string]$item.'Question ID'
        QuestionSetId = $questionSetId
        AssetId = $assetId
        Code = ('LISTENING_PART_1_{0:D3}' -f [int]$item.STT)
        Title = ('Listening Part 1 - {0:D3}' -f [int]$item.STT)
        Question = [string]$item.Question
        A = [string]$item.A
        B = [string]$item.B
        C = [string]$item.C
        Correct = [string]$item.'Đáp án (A/B/C)'
        OriginalFilename = $originalFilename
        LocalFilename = $localFilename
        LocalPath = $localPath
        FileSize = (Get-Item -LiteralPath $localPath).Length
        Checksum = (Get-FileHash -LiteralPath $localPath -Algorithm SHA256).Hash.ToLowerInvariant()
        ObjectKey = "$objectPrefix/$localFilename"
    })
}

# Tránh import trùng theo mã bộ câu hỏi.
$codes = $records.Code | ForEach-Object { "'$(Escape-Sql $_)'" }
$duplicateCount = (docker exec aptis-mysql mysql -uaptis -paptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE code IN ($($codes -join ','))").Trim()
if ([int]$duplicateCount -gt 0) { throw "Đã có $duplicateCount bộ Listening Part 1 trong DB; import bị dừng để không nhân đôi." }

Write-Host 'Uploading 260 audio files to MinIO...'
docker cp $downloadDirectory 'aptis-minio:/tmp/listening-part1-260'
if ($LASTEXITCODE -ne 0) { throw 'Cannot copy downloaded audio to MinIO container.' }
docker exec aptis-minio sh -c "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc mirror /tmp/listening-part1-260 local/$bucket/$objectPrefix"
if ($LASTEXITCODE -ne 0) { throw 'MinIO upload failed.' }
docker exec aptis-minio rm -rf /tmp/listening-part1-260

$documents = foreach ($record in $records) {
    [ordered]@{
        _id = $record.QuestionSetId
        questionSetId = $record.QuestionSetId
        revision = 1
        schemaVersion = 1
        partId = $partId
        taskTypeCode = $taskTypeCode
        title = $record.Title
        instructions = 'Nghe audio và chọn đáp án đúng A, B hoặc C.'
        accessLevel = 'PREMIUM'
        sections = @()
        items = @([ordered]@{
            id = 'item_1'
            sequenceNo = 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = $record.Question }
            responseType = 'SINGLE_CHOICE'
            required = $true
            maxScore = 2
            options = @(
                [ordered]@{ id = 'A'; code = 'A'; content = $record.A },
                [ordered]@{ id = 'B'; code = 'B'; content = $record.B },
                [ordered]@{ id = 'C'; code = 'C'; content = $record.C }
            )
            leftItems = @()
            rightItems = @()
            constraints = [ordered]@{ audioAssetId = $record.AssetId }
            answerKey = [ordered]@{
                type = 'SINGLE_CHOICE'
                selectedOptionId = $record.Correct
                selectedOptionIds = @()
                matches = [ordered]@{}
                orderedOptionIds = @()
                acceptedValues = @()
                caseSensitive = $false
            }
        })
        assets = @([ordered]@{ assetId = $record.AssetId; role = 'ITEM_AUDIO:item_1'; displayOrder = 1 })
        settings = [ordered]@{ shuffleOptions = $true; shuffleItems = $false; maxAudioPlays = 2; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'EXACT_MATCH'; partialCredit = $false; maxScore = 2 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }
}

$documentsJson = $documents | ConvertTo-Json -Depth 12 -Compress
$mongoScript = "const docs = $documentsJson; const ids = docs.map(d => d.questionSetId); if (db.question_set_documents.countDocuments({questionSetId: {`$in: ids}}) > 0) { throw new Error('Duplicate question set document'); } db.question_set_documents.insertMany(docs); print('Inserted ' + docs.length + ' Mongo documents');"
$previousOutputEncoding = $OutputEncoding
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try {
    $mongoScript | docker exec -i aptis-mongo mongosh aptis --quiet
} finally {
    $OutputEncoding = $previousOutputEncoding
}
if ($LASTEXITCODE -ne 0) { throw 'MongoDB document import failed.' }

$sql = [System.Collections.Generic.List[string]]::new()
$sql.Add('START TRANSACTION;')
foreach ($record in $records) {
    $sql.Add("INSERT INTO assets (id, bucket_name, object_key, asset_type, mime_type, original_filename, file_size, checksum_sha256, access_scope, status, created_by, created_at, updated_at) VALUES ('$($record.AssetId)', '$bucket', '$(Escape-Sql $record.ObjectKey)', 'AUDIO', 'audio/mpeg', '$(Escape-Sql $record.OriginalFilename)', $($record.FileSize), '$($record.Checksum)', 'SIGNED_URL', 'READY', '$adminId', NOW(), NOW());")
    $sql.Add("INSERT INTO question_sets (id, part_id, task_type_id, code, title, access_level, status, current_revision, item_count, max_score, published_at, created_by, updated_by, created_at, updated_at) VALUES ('$($record.QuestionSetId)', '$partId', '$taskTypeId', '$($record.Code)', '$(Escape-Sql $record.Title)', 'PREMIUM', 'PUBLISHED', 1, 1, 2.00, NOW(), '$adminId', '$adminId', NOW(), NOW());")
}
$sql.Add('COMMIT;')
try {
    Invoke-MySql $sql
} catch {
    $idsJson = ($records.QuestionSetId | ConvertTo-Json -Compress)
    "db.question_set_documents.deleteMany({questionSetId: {`$in: $idsJson}})" | docker exec -i aptis-mongo mongosh aptis --quiet
    throw
}

if (-not $KeepDownloads) {
    $resolvedDownloadDirectory = (Resolve-Path -LiteralPath $downloadDirectory).Path
    if ($resolvedDownloadDirectory.StartsWith((Resolve-Path -LiteralPath (Split-Path -Parent $SourceFile)).Path, [System.StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedDownloadDirectory -Recurse -Force
    }
}

Write-Host "Imported $($records.Count) Listening Part 1 question sets, audio assets, and Mongo documents."
