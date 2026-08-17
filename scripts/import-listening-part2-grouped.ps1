[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\aptis_listening_part2_grouped_options_corrected.json',
    [switch]$KeepDownloads
)

$ErrorActionPreference = 'Stop'

$downloadDirectory = Join-Path (Split-Path -Parent $SourceFile) '.import-listening-part2-grouped'
$partId = '16000000-0000-4000-8000-000000000022'
$taskTypeId = '12000000-0000-4000-8000-000000000005'
$taskTypeCode = 'SPEAKER_MATCHING'
$existingQuestionSetId = 'd3f292b0-3e43-476b-ace2-7c7ea9775f12'
$existingAssetIds = @(
    '89b935bb-bafa-4333-9b9b-37b7b91ee731',
    '3b35a9a2-1e42-4b03-a8e4-fe6c34b298d9',
    '05f96698-c974-4f6e-9f8a-47eda0b3cd80',
    '0e8d81c3-a5c9-4046-8d84-b4c01eb234c8'
)
$bucket = 'aptis-content'
$objectPrefix = 'content/import/listening-part2-grouped'
$adminEmail = 'plat-admin@test.local'

function Escape-Sql([string]$Value) {
    if ($null -eq $Value) { return '' }
    return $Value.Replace("'", "''")
}

function Invoke-MySql([string[]]$SqlLines) {
    $SqlLines | docker exec -e MYSQL_PWD=aptis -i aptis-mysql mysql -uaptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
}

function Clean-TopicTitle([object]$Topic) {
    if ([int]$Topic.topic_stt -eq 27 -and [string]::IsNullOrWhiteSpace([string]$Topic.topic)) {
        return 'Reading books - Version 2'
    }
    $title = [string]$Topic.topic
    $title = [regex]::Replace($title, '\s*\(2026\)\s*', ' ')
    $title = $title.Replace([char]::ConvertFromUtf32(0x1F525), '')
    return [regex]::Replace($title, '\s+', ' ').Trim()
}

function Get-Hotness([string]$Title) {
    $fire = [char]::ConvertFromUtf32(0x1F525)
    $count = ([regex]::Matches($Title, [regex]::Escape($fire))).Count
    if ($count -eq 0) { return 3 }
    return [Math]::Min(5, $count)
}

if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) {
    throw "Không tìm thấy file nguồn: $SourceFile"
}

$root = Get-Content -LiteralPath $SourceFile -Raw -Encoding utf8 | ConvertFrom-Json
$topics = @($root.topics)
$questions = @($topics | ForEach-Object { @($_.questions) })
if ($topics.Count -ne 29) { throw "Expected 29 topics, found $($topics.Count)." }
if ($questions.Count -ne 116) { throw "Expected 116 questions, found $($questions.Count)." }
if (($questions.question_id | Select-Object -Unique).Count -ne 116) { throw 'Question ID is not unique.' }
if (($questions.audio_url | Select-Object -Unique).Count -ne 116) { throw 'Audio URL is not unique.' }

foreach ($topic in $topics) {
    $topicQuestions = @($topic.questions)
    if ($topicQuestions.Count -ne 4) { throw "Topic $($topic.topic_stt) must have four speakers." }
    if ((@($topicQuestions.speaker | Sort-Object) -join ',') -ne 'A,B,C,D') {
        throw "Topic $($topic.topic_stt) does not contain speakers A-D exactly once."
    }
    foreach ($question in $topicQuestions) {
        $options = if ($null -ne $topic.options) { @($topic.options) } else { @($question.options) }
        if ($options.Count -lt 4) { throw "Topic $($topic.topic_stt), speaker $($question.speaker) has too few options." }
        if (-not ($options -ccontains [string]$question.correct_answer)) {
            throw "Correct answer is not in options for topic $($topic.topic_stt), speaker $($question.speaker)."
        }
    }
}

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Không tìm thấy admin $adminEmail" }

$existingSetCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingSetCount -ne 1) { throw "Expected exactly the one manually-created Listening Part 2 draft, found $existingSetCount sets." }
$existingSetFound = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE id='$existingQuestionSetId' AND part_id='$partId'").Trim()
if ($existingSetFound -ne '1') { throw 'The expected Listening Part 2 draft was not found.' }

if (Test-Path -LiteralPath $downloadDirectory) {
    $resolvedParent = (Resolve-Path -LiteralPath (Split-Path -Parent $SourceFile)).Path
    $resolvedDownload = (Resolve-Path -LiteralPath $downloadDirectory).Path
    if ([IO.Path]::GetDirectoryName($resolvedDownload) -ne $resolvedParent) {
        throw "Refusing to clear unexpected download directory: $resolvedDownload"
    }
    $downloadItem = Get-Item -LiteralPath $resolvedDownload -Force
    if (($downloadItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'Refusing to clear a reparse point.'
    }
    Remove-Item -LiteralPath $resolvedDownload -Recurse -Force
}
New-Item -ItemType Directory -Path $downloadDirectory | Out-Null

$topicRecords = [Collections.Generic.List[object]]::new()
$audioRecords = [Collections.Generic.List[object]]::new()
$counter = 0
$titleTotals = @{}
$titleSeen = @{}
foreach ($topic in $topics) {
    $baseTitle = Clean-TopicTitle $topic
    $titleTotals[$baseTitle] = 1 + [int]$titleTotals[$baseTitle]
}

foreach ($topic in $topics) {
    $topicNo = [int]$topic.topic_stt
    $questionSetId = if ($topicNo -eq 1) { $existingQuestionSetId } else { [guid]::NewGuid().ToString() }
    $topicId = [guid]::NewGuid().ToString()
    $baseTitle = Clean-TopicTitle $topic
    $titleSeen[$baseTitle] = 1 + [int]$titleSeen[$baseTitle]
    $cleanTitle = if ([int]$titleTotals[$baseTitle] -gt 1) {
        "$baseTitle - Bộ $($titleSeen[$baseTitle])"
    } else {
        $baseTitle
    }
    $hotness = Get-Hotness ([string]$topic.topic)
    $examYear = if (([string]$topic.topic) -match '\(2026\)') { 2026 } else { $null }
    $items = [Collections.Generic.List[object]]::new()
    $documentAssets = [Collections.Generic.List[object]]::new()

    for ($itemIndex = 0; $itemIndex -lt 4; $itemIndex++) {
        $counter++
        $question = $topic.questions[$itemIndex]
        $assetId = if ($topicNo -eq 1) { $existingAssetIds[$itemIndex] } else { [guid]::NewGuid().ToString() }
        $audioUri = [Uri]$question.audio_url
        $originalFilename = [IO.Path]::GetFileName($audioUri.AbsolutePath)
        $localFilename = "$assetId.mp3"
        $localPath = Join-Path $downloadDirectory $localFilename

        Write-Host "[$counter/116] Downloading topic $topicNo speaker $($question.speaker): $originalFilename"
        $downloaded = $false
        for ($attempt = 1; $attempt -le 3 -and -not $downloaded; $attempt++) {
            try {
                Invoke-WebRequest -Uri $question.audio_url -OutFile $localPath -UseBasicParsing
                $bytes = [IO.File]::ReadAllBytes($localPath)
                if ($bytes.Length -le 3) { throw 'Empty audio file.' }
                $isId3 = $bytes[0] -eq 0x49 -and $bytes[1] -eq 0x44 -and $bytes[2] -eq 0x33
                $isFrame = $bytes[0] -eq 0xFF -and (($bytes[1] -band 0xE0) -eq 0xE0)
                if (-not ($isId3 -or $isFrame)) { throw 'Downloaded file has no MP3 signature.' }
                $downloaded = $true
            } catch {
                if (Test-Path -LiteralPath $localPath) { Remove-Item -LiteralPath $localPath -Force }
                if ($attempt -eq 3) { throw "Không tải được topic $topicNo speaker $($question.speaker): $($_.Exception.Message)" }
                Start-Sleep -Seconds ($attempt * 2)
            }
        }

        $options = if ($null -ne $topic.options) { @($topic.options) } else { @($question.options) }
        $optionObjects = [Collections.Generic.List[object]]::new()
        $correctOptionId = $null
        for ($optionIndex = 0; $optionIndex -lt $options.Count; $optionIndex++) {
            $optionId = [char](65 + $optionIndex)
            $optionObjects.Add([ordered]@{ id = [string]$optionId; code = [string]$optionId; content = [string]$options[$optionIndex] })
            if ([string]$options[$optionIndex] -ceq [string]$question.correct_answer) { $correctOptionId = [string]$optionId }
        }
        if ($null -eq $correctOptionId) { throw "Cannot map answer for topic $topicNo speaker $($question.speaker)." }

        $itemId = "item_$($itemIndex + 1)"
        $items.Add([ordered]@{
            id = $itemId
            sequenceNo = $itemIndex + 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = "Người nói $($question.speaker)" }
            responseType = 'SINGLE_CHOICE'
            required = $true
            maxScore = 2
            options = @($optionObjects)
            leftItems = @()
            rightItems = @()
            constraints = [ordered]@{ audioAssetId = $assetId; sourceQuestionId = [string]$question.question_id }
            answerKey = [ordered]@{
                type = 'SINGLE_CHOICE'
                selectedOptionId = $correctOptionId
                selectedOptionIds = @()
                matches = [ordered]@{}
                orderedOptionIds = @()
                acceptedValues = @()
                caseSensitive = $false
            }
        })
        $documentAssets.Add([ordered]@{ assetId = $assetId; role = "ITEM_AUDIO:$itemId"; displayOrder = $itemIndex + 1 })

        $audioRecords.Add([pscustomobject]@{
            TopicNo = $topicNo
            AssetId = $assetId
            Existing = $topicNo -eq 1
            OriginalFilename = $originalFilename
            LocalFilename = $localFilename
            LocalPath = $localPath
            FileSize = (Get-Item -LiteralPath $localPath).Length
            Checksum = (Get-FileHash -LiteralPath $localPath -Algorithm SHA256).Hash.ToLowerInvariant()
            ObjectKey = if ($topicNo -eq 1) { $null } else { "$objectPrefix/$localFilename" }
        })
    }

    $document = [ordered]@{
        _id = $questionSetId
        questionSetId = $questionSetId
        revision = 1
        schemaVersion = 1
        partId = $partId
        taskTypeCode = $taskTypeCode
        title = $cleanTitle
        instructions = 'Nghe bốn người nói về cùng một chủ đề và chọn ý kiến phù hợp cho từng người.'
        accessLevel = 'PREMIUM'
        sections = @()
        items = @($items)
        assets = @($documentAssets)
        settings = [ordered]@{ shuffleOptions = $false; shuffleItems = $false; maxAudioPlays = 2; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'EXACT_MATCH'; partialCredit = $false; maxScore = 8 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }

    $topicRecords.Add([pscustomobject]@{
        TopicNo = $topicNo
        TopicId = $topicId
        QuestionSetId = $questionSetId
        Code = ('LISTENING_PART_2_{0:D3}' -f $topicNo)
        TopicCode = ('LISTENING_P2_TOPIC_{0:D3}' -f $topicNo)
        Title = $cleanTitle
        Hotness = $hotness
        ExamYear = $examYear
        Document = $document
    })
}

# The manually-created first topic must contain the same four source files.
for ($i = 0; $i -lt 4; $i++) {
    $asset = $audioRecords[$i]
    $objectKey = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT object_key FROM aptis.assets WHERE id='$($asset.AssetId)' LIMIT 1").Trim()
    if ([string]::IsNullOrWhiteSpace($objectKey)) { throw "Missing existing asset $($asset.AssetId)." }
    $storedHash = (docker exec aptis-minio sh -c "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc cat local/$bucket/$objectKey | sha256sum | cut -d' ' -f1").Trim()
    if ($storedHash -ne $asset.Checksum) { throw "Existing audio does not match source for topic 1 item $($i + 1)." }
}

$newAudioDirectory = Join-Path $downloadDirectory 'new'
New-Item -ItemType Directory -Path $newAudioDirectory | Out-Null
foreach ($asset in @($audioRecords | Where-Object { -not $_.Existing })) {
    Copy-Item -LiteralPath $asset.LocalPath -Destination (Join-Path $newAudioDirectory $asset.LocalFilename)
}

Write-Host 'Uploading 112 new audio files to MinIO...'
docker cp $newAudioDirectory 'aptis-minio:/tmp/listening-part2-grouped'
if ($LASTEXITCODE -ne 0) { throw 'Cannot copy downloaded audio to MinIO container.' }
docker exec aptis-minio sh -c "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc mirror /tmp/listening-part2-grouped local/$bucket/$objectPrefix"
if ($LASTEXITCODE -ne 0) { throw 'MinIO upload failed.' }
docker exec aptis-minio rm -rf /tmp/listening-part2-grouped

$documents = @($topicRecords | ForEach-Object { $_.Document })
$documentsJson = $documents | ConvertTo-Json -Depth 14 -Compress
$newIdsJson = @($topicRecords | Where-Object TopicNo -gt 1 | ForEach-Object QuestionSetId) | ConvertTo-Json -Compress
$mongoScript = "const docs=$documentsJson; const existing=db.question_set_documents.findOne({questionSetId:'$existingQuestionSetId'}); if (!existing) throw new Error('Existing topic 1 document not found'); if (db.question_set_documents.countDocuments({questionSetId:{`$in:$newIdsJson}})>0) throw new Error('Duplicate generated IDs'); db.question_set_documents.replaceOne({questionSetId:'$existingQuestionSetId'},docs[0]); db.question_set_documents.insertMany(docs.slice(1)); print('Upserted '+docs.length+' Listening Part 2 documents');"
$previousOutputEncoding = $OutputEncoding
$OutputEncoding = [Text.UTF8Encoding]::new($false)
try {
    $mongoScript | docker exec -i aptis-mongo mongosh aptis --quiet
} finally {
    $OutputEncoding = $previousOutputEncoding
}
if ($LASTEXITCODE -ne 0) { throw 'MongoDB document import failed.' }

$sql = [Collections.Generic.List[string]]::new()
$sql.Add('START TRANSACTION;')
foreach ($topic in $topicRecords) {
    $examYearSql = if ($null -eq $topic.ExamYear) { 'NULL' } else { [string]$topic.ExamYear }
    $sql.Add("INSERT INTO topics (id, parent_id, code, name, description, is_active, created_at, updated_at) VALUES ('$($topic.TopicId)', NULL, '$($topic.TopicCode)', '$(Escape-Sql $topic.Title)', NULL, 1, NOW(), NOW());")
}
foreach ($asset in @($audioRecords | Where-Object Existing)) {
    $sql.Add("UPDATE assets SET checksum_sha256='$($asset.Checksum)', file_size=$($asset.FileSize), updated_at=NOW() WHERE id='$($asset.AssetId)';")
}
foreach ($asset in @($audioRecords | Where-Object { -not $_.Existing })) {
    $sql.Add("INSERT INTO assets (id, bucket_name, object_key, asset_type, mime_type, original_filename, file_size, checksum_sha256, access_scope, status, created_by, created_at, updated_at) VALUES ('$($asset.AssetId)', '$bucket', '$(Escape-Sql $asset.ObjectKey)', 'AUDIO', 'audio/mpeg', '$(Escape-Sql $asset.OriginalFilename)', $($asset.FileSize), '$($asset.Checksum)', 'SIGNED_URL', 'READY', '$adminId', NOW(), NOW());")
}
foreach ($topic in $topicRecords) {
    $examYearSql = if ($null -eq $topic.ExamYear) { 'NULL' } else { [string]$topic.ExamYear }
    if ($topic.TopicNo -eq 1) {
        $sql.Add("UPDATE question_sets SET topic_id='$($topic.TopicId)', task_type_id='$taskTypeId', code='$($topic.Code)', title='$(Escape-Sql $topic.Title)', hotness=$($topic.Hotness), exam_year=$examYearSql, access_level='PREMIUM', status='PUBLISHED', current_revision=1, item_count=4, max_score=8.00, published_at=NOW(), updated_by='$adminId', updated_at=NOW() WHERE id='$existingQuestionSetId';")
    } else {
        $sql.Add("INSERT INTO question_sets (id, part_id, task_type_id, topic_id, code, title, hotness, exam_year, access_level, status, current_revision, item_count, max_score, published_at, created_by, updated_by, created_at, updated_at) VALUES ('$($topic.QuestionSetId)', '$partId', '$taskTypeId', '$($topic.TopicId)', '$($topic.Code)', '$(Escape-Sql $topic.Title)', $($topic.Hotness), $examYearSql, 'PREMIUM', 'PUBLISHED', 1, 4, 8.00, NOW(), '$adminId', '$adminId', NOW(), NOW());")
    }
}
$sql.Add('COMMIT;')
Invoke-MySql $sql

if (-not $KeepDownloads) {
    $resolvedParent = (Resolve-Path -LiteralPath (Split-Path -Parent $SourceFile)).Path
    $resolvedDownload = (Resolve-Path -LiteralPath $downloadDirectory).Path
    if ([IO.Path]::GetDirectoryName($resolvedDownload) -ne $resolvedParent) { throw 'Unexpected cleanup path.' }
    $downloadItem = Get-Item -LiteralPath $resolvedDownload -Force
    if (($downloadItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Refusing to clear a reparse point.' }
    Remove-Item -LiteralPath $resolvedDownload -Recurse -Force
}

Write-Host 'Imported 29 Listening Part 2 topics, 116 items, and 116 audio links.'

