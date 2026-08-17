[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\speaking\part 3\aptis_speaking_part3_grouped_by_pair.json',
    [switch]$KeepDownloads
)

$ErrorActionPreference = 'Stop'
$partId = '16000000-0000-4000-8000-000000000033'
$taskTypeId = '12000000-0000-4000-8000-000000000010'
$taskTypeCode = 'AUDIO_RECORDING'
$bucket = 'aptis-content'
$objectPrefix = 'content/import/speaking-part3-pairs'
$adminEmail = 'plat-admin@test.local'
$downloadDirectory = Join-Path (Split-Path -Parent $SourceFile) '.import-speaking-part3-pairs'

function Escape-Sql([string]$Value) {
    if ($null -eq $Value) { return '' }
    return $Value.Replace("'", "''")
}

function Invoke-MySql([Collections.Generic.List[string]]$SqlLines) {
    $SqlLines | docker exec -e MYSQL_PWD=aptis -i aptis-mysql mysql -uaptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
}

function Clear-DownloadDirectory {
    if (-not (Test-Path -LiteralPath $downloadDirectory)) { return }
    $sourceParent = (Resolve-Path -LiteralPath (Split-Path -Parent $SourceFile)).Path
    $downloadPath = (Resolve-Path -LiteralPath $downloadDirectory).Path
    if ([IO.Path]::GetDirectoryName($downloadPath) -ne $sourceParent) {
        throw "Refusing to clear unexpected directory: $downloadPath"
    }
    $item = Get-Item -LiteralPath $downloadPath -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'Refusing to clear a reparse point.'
    }
    Remove-Item -LiteralPath $downloadPath -Recurse -Force
}

function Get-ImageMetadata([string]$Path) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 12) { throw 'Downloaded image is empty.' }
    if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) {
        return [pscustomobject]@{ Extension = '.jpg'; MimeType = 'image/jpeg' }
    }
    if ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) {
        return [pscustomobject]@{ Extension = '.png'; MimeType = 'image/png' }
    }
    if ([Text.Encoding]::ASCII.GetString($bytes, 0, 4) -eq 'RIFF' -and [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -eq 'WEBP') {
        return [pscustomobject]@{ Extension = '.webp'; MimeType = 'image/webp' }
    }
    $isoBrand = [Text.Encoding]::ASCII.GetString($bytes, 4, 8)
    if ($isoBrand -eq 'ftypavif' -or $isoBrand -eq 'ftypavis') {
        return [pscustomobject]@{ Extension = '.avif'; MimeType = 'image/avif' }
    }
    throw 'Downloaded file has no supported image signature.'
}

if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) { throw "Source file not found: $SourceFile" }
$root = Get-Content -LiteralPath $SourceFile -Raw -Encoding utf8 | ConvertFrom-Json
$pairs = @($root.pairs)
$questions = @($pairs | ForEach-Object { @($_.questions) })
$imageUrls = @($pairs | ForEach-Object { @($_.images) })
if ([int]$root.part -ne 3 -or [string]$root.skill -cne 'speaking') { throw 'Source is not Speaking Part 3.' }
if ($pairs.Count -ne 60 -or $questions.Count -ne 180 -or $imageUrls.Count -ne 120) { throw 'Unexpected source totals.' }
if (($pairs.pair_id | Select-Object -Unique).Count -ne 60) { throw 'Pair ID is not unique.' }
if (($questions.item_id | Select-Object -Unique).Count -ne 180) { throw 'Item ID is not unique.' }

for ($pairIndex = 0; $pairIndex -lt 60; $pairIndex++) {
    $pair = $pairs[$pairIndex]
    if ([int]$pair.pair_stt -ne ($pairIndex + 1)) { throw "Pair order changed at index $pairIndex." }
    if (@($pair.images).Count -ne 2 -or @($pair.questions).Count -ne 3) { throw "Invalid pair $($pair.pair_stt)." }
    for ($questionIndex = 0; $questionIndex -lt 3; $questionIndex++) {
        $question = $pair.questions[$questionIndex]
        if ([int]$question.question_order -ne ($questionIndex + 1)) { throw "Question order changed in pair $($pair.pair_stt)." }
        if ([int]$question.global_number -ne ($pairIndex * 3 + $questionIndex + 1)) { throw "Global number changed in pair $($pair.pair_stt)." }
    }
}

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Admin not found: $adminEmail" }
$existingCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingCount -ne 0) { throw "Speaking Part 3 already contains $existingCount sets; stopped to avoid duplicates." }

Clear-DownloadDirectory
New-Item -ItemType Directory -Path $downloadDirectory | Out-Null
$assetByUrl = @{}
$assetRecords = [Collections.Generic.List[object]]::new()
$uniqueUrls = @($imageUrls | Select-Object -Unique)
for ($index = 0; $index -lt $uniqueUrls.Count; $index++) {
    $url = [string]$uniqueUrls[$index]
    $assetId = [guid]::NewGuid().ToString()
    $temporaryPath = Join-Path $downloadDirectory "$assetId.download"
    Write-Host "[$($index + 1)/$($uniqueUrls.Count)] Downloading $([IO.Path]::GetFileName(([Uri]$url).AbsolutePath))"
    $downloaded = $false
    for ($attempt = 1; $attempt -le 3 -and -not $downloaded; $attempt++) {
        try {
            Invoke-WebRequest -Uri $url -OutFile $temporaryPath -UseBasicParsing
            $metadata = Get-ImageMetadata $temporaryPath
            $downloaded = $true
        } catch {
            if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
            if ($attempt -eq 3) { throw "Cannot download image $url : $($_.Exception.Message)" }
            Start-Sleep -Seconds ($attempt * 2)
        }
    }
    $localFilename = "$assetId$($metadata.Extension)"
    $localPath = Join-Path $downloadDirectory $localFilename
    Move-Item -LiteralPath $temporaryPath -Destination $localPath
    $record = [pscustomobject]@{
        AssetId = $assetId
        Url = $url
        OriginalFilename = [IO.Path]::GetFileName(([Uri]$url).AbsolutePath)
        LocalFilename = $localFilename
        LocalPath = $localPath
        MimeType = $metadata.MimeType
        FileSize = (Get-Item -LiteralPath $localPath).Length
        Checksum = (Get-FileHash -LiteralPath $localPath -Algorithm SHA256).Hash.ToLowerInvariant()
        ObjectKey = "$objectPrefix/$localFilename"
    }
    $assetByUrl[$url] = $record
    $assetRecords.Add($record)
}

$titleTotals = @{}
$titleSeen = @{}
foreach ($pair in $pairs) {
    $baseTitle = [regex]::Replace(([string]$pair.questions[1].question).Trim(), '\s+', ' ')
    $titleTotals[$baseTitle] = 1 + [int]$titleTotals[$baseTitle]
}
$pairRecords = [Collections.Generic.List[object]]::new()
foreach ($pair in $pairs) {
    $pairNo = [int]$pair.pair_stt
    $questionSetId = [guid]::NewGuid().ToString()
    $topicId = [guid]::NewGuid().ToString()
    $baseTitle = [regex]::Replace(([string]$pair.questions[1].question).Trim(), '\s+', ' ')
    $titleSeen[$baseTitle] = 1 + [int]$titleSeen[$baseTitle]
    $title = if ([int]$titleTotals[$baseTitle] -gt 1) { "$baseTitle - Bộ $($titleSeen[$baseTitle])" } else { $baseTitle }
    $items = [Collections.Generic.List[object]]::new()
    for ($itemIndex = 0; $itemIndex -lt 3; $itemIndex++) {
        $question = $pair.questions[$itemIndex]
        $items.Add([ordered]@{
            id = "item_$($itemIndex + 1)"
            sequenceNo = $itemIndex + 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = [string]$question.question }
            responseType = 'AUDIO_RECORDING'
            required = $true
            maxScore = 5
            options = @(); leftItems = @(); rightItems = @()
            constraints = [ordered]@{
                prepSeconds = 0; responseSeconds = [int]$root.response_time_seconds
                minWords = [int]$root.recommended_words.min; maxWords = [int]$root.recommended_words.max
                sourceItemId = [string]$question.item_id; sourceGlobalNumber = [int]$question.global_number
            }
            rubricCode = 'APTIS_SPEAKING'; answerKey = $null
        })
    }
    $assets = @(
        [ordered]@{ assetId = $assetByUrl[[string]$pair.images[0]].AssetId; role = 'STIMULUS_IMAGE'; displayOrder = 1 },
        [ordered]@{ assetId = $assetByUrl[[string]$pair.images[1]].AssetId; role = 'SECONDARY_IMAGE'; displayOrder = 2 }
    )
    $document = [ordered]@{
        _id = $questionSetId; questionSetId = $questionSetId; revision = 1; schemaVersion = 1
        partId = $partId; taskTypeCode = $taskTypeCode; title = $title
        instructions = 'So sánh hai bức ảnh và trả lời lần lượt 3 câu hỏi. Mỗi câu nói trong 45 giây.'
        accessLevel = 'PREMIUM'; sections = @(); items = @($items); assets = $assets
        settings = [ordered]@{ shuffleOptions = $false; shuffleItems = $false; maxAudioPlays = $null; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'RUBRIC'; partialCredit = $true; maxScore = 15 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }
    $pairRecords.Add([pscustomobject]@{
        PairNo = $pairNo; PairId = [string]$pair.pair_id; TopicId = $topicId; QuestionSetId = $questionSetId
        Code = ('SPEAKING_PART_3_{0:D3}' -f $pairNo); TopicCode = ('SPEAKING_P3_PAIR_{0:D3}' -f $pairNo)
        Title = $title; Document = $document
    })
}

Write-Host "Uploading $($assetRecords.Count) unique images to MinIO..."
docker exec aptis-minio rm -rf /tmp/speaking-part3-pairs
docker cp $downloadDirectory 'aptis-minio:/tmp/speaking-part3-pairs'
if ($LASTEXITCODE -ne 0) { throw 'Cannot copy images to MinIO container.' }
docker exec aptis-minio sh -c "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc mirror /tmp/speaking-part3-pairs local/$bucket/$objectPrefix"
if ($LASTEXITCODE -ne 0) { throw 'MinIO upload failed.' }
docker exec aptis-minio rm -rf /tmp/speaking-part3-pairs

$documentsJson = @($pairRecords | ForEach-Object { $_.Document }) | ConvertTo-Json -Depth 14 -Compress
$mongoScript = "const docs=$documentsJson; if (db.question_set_documents.countDocuments({partId:'$partId'})>0) throw new Error('Speaking Part 3 documents already exist'); db.question_set_documents.insertMany(docs); print('Inserted '+docs.length+' Speaking Part 3 documents');"
$previousOutputEncoding = $OutputEncoding
$OutputEncoding = [Text.UTF8Encoding]::new($false)
try { $mongoScript | docker exec -i aptis-mongo mongosh aptis --quiet } finally { $OutputEncoding = $previousOutputEncoding }
if ($LASTEXITCODE -ne 0) { throw 'MongoDB document import failed.' }

$sql = [Collections.Generic.List[string]]::new()
$sql.Add('START TRANSACTION;')
foreach ($pair in $pairRecords) {
    $sql.Add("INSERT INTO topics (id,parent_id,code,name,description,is_active,created_at,updated_at) VALUES ('$($pair.TopicId)',NULL,'$($pair.TopicCode)','$(Escape-Sql $pair.Title)','Source pair ID: $(Escape-Sql $pair.PairId)',1,NOW(),NOW());")
}
foreach ($asset in $assetRecords) {
    $sql.Add("INSERT INTO assets (id,bucket_name,object_key,asset_type,mime_type,original_filename,file_size,checksum_sha256,access_scope,status,created_by,created_at,updated_at) VALUES ('$($asset.AssetId)','$bucket','$(Escape-Sql $asset.ObjectKey)','IMAGE','$($asset.MimeType)','$(Escape-Sql $asset.OriginalFilename)',$($asset.FileSize),'$($asset.Checksum)','SIGNED_URL','READY','$adminId',NOW(),NOW());")
}
foreach ($pair in $pairRecords) {
    $sql.Add("INSERT INTO question_sets (id,part_id,task_type_id,topic_id,code,title,hotness,exam_year,access_level,status,current_revision,item_count,max_score,published_at,created_by,updated_by,created_at,updated_at) VALUES ('$($pair.QuestionSetId)','$partId','$taskTypeId','$($pair.TopicId)','$($pair.Code)','$(Escape-Sql $pair.Title)',3,NULL,'PREMIUM','PUBLISHED',1,3,15.00,NOW(),'$adminId','$adminId',NOW(),NOW());")
}
$sql.Add('COMMIT;')
try { Invoke-MySql $sql } catch {
    docker exec aptis-mongo mongosh aptis --quiet --eval "db.question_set_documents.deleteMany({partId:'$partId'})" | Out-Host
    throw
}

if (-not $KeepDownloads) { Clear-DownloadDirectory }
Write-Host "Imported 60 Speaking Part 3 pairs, 180 ordered prompts, and $($assetRecords.Count) unique images."
