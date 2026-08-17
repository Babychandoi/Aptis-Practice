[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\listenning\part 3\aptis_listening_part3_grouped_by_topic(1).json',
    [switch]$KeepDownloads
)

$ErrorActionPreference = 'Stop'

$partId = '16000000-0000-4000-8000-000000000023'
$taskTypeId = '12000000-0000-4000-8000-000000000005'
$taskTypeCode = 'SPEAKER_MATCHING'
$bucket = 'aptis-content'
$objectPrefix = 'content/import/listening-part3-grouped'
$adminEmail = 'plat-admin@test.local'
$downloadDirectory = Join-Path (Split-Path -Parent $SourceFile) '.import-listening-part3-grouped'

function Escape-Sql([string]$Value) {
    if ($null -eq $Value) { return '' }
    return $Value.Replace("'", "''")
}

function Invoke-MySql([Collections.Generic.List[string]]$SqlLines) {
    $SqlLines | docker exec -e MYSQL_PWD=aptis -i aptis-mysql mysql -uaptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
}

function Clean-TopicTitle([string]$Title) {
    $fire = [char]::ConvertFromUtf32(0x1F525)
    $clean = $Title.Replace($fire, '')
    return [regex]::Replace($clean, '\s+', ' ').Trim()
}

function Get-Hotness([string]$Title) {
    $fire = [char]::ConvertFromUtf32(0x1F525)
    $count = ([regex]::Matches($Title, [regex]::Escape($fire))).Count
    if ($count -eq 0) { return 3 }
    return [Math]::Min(5, $count)
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

if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) {
    throw "Không tìm thấy file nguồn: $SourceFile"
}

$root = Get-Content -LiteralPath $SourceFile -Raw -Encoding utf8 | ConvertFrom-Json
$topics = @($root.topics)
$questions = @($topics | ForEach-Object { @($_.questions) })
$rootOptions = @($root.options)

if ([int]$root.part -ne 3) { throw "Expected Part 3, found Part $($root.part)." }
if ($topics.Count -ne 38) { throw "Expected 38 topics, found $($topics.Count)." }
if ($questions.Count -ne 152) { throw "Expected 152 questions, found $($questions.Count)." }
if ($rootOptions.Count -ne 3) { throw "Expected three shared options, found $($rootOptions.Count)." }
if (($questions.question_id | Select-Object -Unique).Count -ne 152) { throw 'Question ID is not unique.' }
if (($topics.audio_url | Select-Object -Unique).Count -ne 38) { throw 'Audio URL is not unique.' }
if ((@($rootOptions.text) -join '|') -cne 'Man|Woman|Both') { throw 'Shared options are not in Man, Woman, Both order.' }

for ($topicIndex = 0; $topicIndex -lt $topics.Count; $topicIndex++) {
    $topic = $topics[$topicIndex]
    if ([int]$topic.topic_stt -ne ($topicIndex + 1)) {
        throw "Topic order changed at index $topicIndex."
    }
    $topicQuestions = @($topic.questions)
    if ($topicQuestions.Count -ne 4) { throw "Topic $($topic.topic_stt) must contain four questions." }
    for ($questionIndex = 0; $questionIndex -lt 4; $questionIndex++) {
        $question = $topicQuestions[$questionIndex]
        $expectedDisplayNo = "15.$($questionIndex + 1)"
        if ([string]$question.display_no -cne $expectedDisplayNo) {
            throw "Topic $($topic.topic_stt) question order is invalid: expected $expectedDisplayNo, found $($question.display_no)."
        }
        if (-not (@('0', '1', '2') -ccontains [string]$question.correct_value)) {
            throw "Invalid correct value at topic $($topic.topic_stt), $expectedDisplayNo."
        }
        $mappedAnswer = @('Man', 'Woman', 'Both')[[int]$question.correct_value]
        if ([string]$question.correct_answer -cne $mappedAnswer) {
            throw "Correct answer mismatch at topic $($topic.topic_stt), $expectedDisplayNo."
        }
    }
}

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Không tìm thấy admin $adminEmail" }

$existingCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingCount -ne 0) { throw "Listening Part 3 already contains $existingCount question sets; import stopped to avoid duplicates." }

Clear-DownloadDirectory
New-Item -ItemType Directory -Path $downloadDirectory | Out-Null

$topicRecords = [Collections.Generic.List[object]]::new()
$audioRecords = [Collections.Generic.List[object]]::new()
$titleTotals = @{}
$titleSeen = @{}
foreach ($topic in $topics) {
    $baseTitle = Clean-TopicTitle ([string]$topic.topic)
    $titleTotals[$baseTitle] = 1 + [int]$titleTotals[$baseTitle]
}

foreach ($topic in $topics) {
    $topicNo = [int]$topic.topic_stt
    $questionSetId = [guid]::NewGuid().ToString()
    $topicId = [guid]::NewGuid().ToString()
    $assetId = [guid]::NewGuid().ToString()
    $baseTitle = Clean-TopicTitle ([string]$topic.topic)
    $titleSeen[$baseTitle] = 1 + [int]$titleSeen[$baseTitle]
    $cleanTitle = if ([int]$titleTotals[$baseTitle] -gt 1) {
        "$baseTitle - Bộ $($titleSeen[$baseTitle])"
    } else { $baseTitle }
    $hotness = Get-Hotness ([string]$topic.topic)
    $examYear = if (([string]$topic.topic -match '\(2026\)')) { 2026 } else { $null }

    $audioUri = [Uri]$topic.audio_url
    $originalFilename = [IO.Path]::GetFileName($audioUri.AbsolutePath)
    $localFilename = "$assetId.mp3"
    $localPath = Join-Path $downloadDirectory $localFilename
    Write-Host "[$topicNo/38] Downloading $cleanTitle - $originalFilename"

    $downloaded = $false
    for ($attempt = 1; $attempt -le 3 -and -not $downloaded; $attempt++) {
        try {
            Invoke-WebRequest -Uri $topic.audio_url -OutFile $localPath -UseBasicParsing
            $bytes = [IO.File]::ReadAllBytes($localPath)
            if ($bytes.Length -le 3) { throw 'Empty audio file.' }
            $isId3 = $bytes[0] -eq 0x49 -and $bytes[1] -eq 0x44 -and $bytes[2] -eq 0x33
            $isFrame = $bytes[0] -eq 0xFF -and (($bytes[1] -band 0xE0) -eq 0xE0)
            if (-not ($isId3 -or $isFrame)) { throw 'Downloaded file has no MP3 signature.' }
            $downloaded = $true
        } catch {
            if (Test-Path -LiteralPath $localPath) { Remove-Item -LiteralPath $localPath -Force }
            if ($attempt -eq 3) { throw "Không tải được audio topic ${topicNo}: $($_.Exception.Message)" }
            Start-Sleep -Seconds ($attempt * 2)
        }
    }

    $items = [Collections.Generic.List[object]]::new()
    for ($itemIndex = 0; $itemIndex -lt 4; $itemIndex++) {
        $question = $topic.questions[$itemIndex]
        $optionObjects = [Collections.Generic.List[object]]::new()
        for ($optionIndex = 0; $optionIndex -lt $rootOptions.Count; $optionIndex++) {
            $optionId = [char](65 + $optionIndex)
            $optionObjects.Add([ordered]@{
                id = [string]$optionId
                code = [string]$optionId
                content = [string]$rootOptions[$optionIndex].text
            })
        }
        $correctOptionId = [string][char](65 + [int]$question.correct_value)
        $items.Add([ordered]@{
            id = "item_$($itemIndex + 1)"
            sequenceNo = $itemIndex + 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = [string]$question.statement }
            responseType = 'SINGLE_CHOICE'
            required = $true
            maxScore = 2
            options = @($optionObjects)
            leftItems = @()
            rightItems = @()
            constraints = [ordered]@{
                sourceQuestionId = [string]$question.question_id
                sourceDisplayNo = [string]$question.display_no
            }
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
    }

    $document = [ordered]@{
        _id = $questionSetId
        questionSetId = $questionSetId
        revision = 1
        schemaVersion = 1
        partId = $partId
        taskTypeCode = $taskTypeCode
        title = $cleanTitle
        instructions = 'Nghe hai người trao đổi và xác định mỗi ý kiến thuộc về người đàn ông, người phụ nữ hoặc cả hai.'
        accessLevel = 'PREMIUM'
        sections = @()
        items = @($items)
        assets = @([ordered]@{ assetId = $assetId; role = 'MAIN_AUDIO'; displayOrder = 1 })
        settings = [ordered]@{
            shuffleOptions = $false
            shuffleItems = $false
            maxAudioPlays = 2
            showAnswerAfterEachItem = $false
            allowReview = $true
        }
        scoring = [ordered]@{ strategy = 'EXACT_MATCH'; partialCredit = $false; maxScore = 8 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }

    $topicRecords.Add([pscustomobject]@{
        TopicNo = $topicNo
        TopicId = $topicId
        QuestionSetId = $questionSetId
        Code = ('LISTENING_PART_3_{0:D3}' -f $topicNo)
        TopicCode = ('LISTENING_P3_TOPIC_{0:D3}' -f $topicNo)
        Title = $cleanTitle
        Hotness = $hotness
        ExamYear = $examYear
        Document = $document
    })
    $audioRecords.Add([pscustomobject]@{
        AssetId = $assetId
        OriginalFilename = $originalFilename
        LocalFilename = $localFilename
        LocalPath = $localPath
        FileSize = (Get-Item -LiteralPath $localPath).Length
        Checksum = (Get-FileHash -LiteralPath $localPath -Algorithm SHA256).Hash.ToLowerInvariant()
        ObjectKey = "$objectPrefix/$localFilename"
    })
}

Write-Host 'Uploading 38 shared audio files to MinIO...'
docker cp $downloadDirectory 'aptis-minio:/tmp/listening-part3-grouped'
if ($LASTEXITCODE -ne 0) { throw 'Cannot copy audio to MinIO container.' }
docker exec aptis-minio sh -c "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc mirror /tmp/listening-part3-grouped local/$bucket/$objectPrefix"
if ($LASTEXITCODE -ne 0) { throw 'MinIO upload failed.' }
docker exec aptis-minio rm -rf /tmp/listening-part3-grouped

$documentsJson = @($topicRecords | ForEach-Object { $_.Document }) | ConvertTo-Json -Depth 14 -Compress
$mongoScript = "const docs=$documentsJson; if (db.question_set_documents.countDocuments({partId:'$partId'})>0) throw new Error('Listening Part 3 documents already exist'); db.question_set_documents.insertMany(docs); print('Inserted '+docs.length+' Listening Part 3 documents');"
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
    $sql.Add("INSERT INTO topics (id, parent_id, code, name, description, is_active, created_at, updated_at) VALUES ('$($topic.TopicId)', NULL, '$($topic.TopicCode)', '$(Escape-Sql $topic.Title)', NULL, 1, NOW(), NOW());")
}
foreach ($asset in $audioRecords) {
    $sql.Add("INSERT INTO assets (id, bucket_name, object_key, asset_type, mime_type, original_filename, file_size, checksum_sha256, access_scope, status, created_by, created_at, updated_at) VALUES ('$($asset.AssetId)', '$bucket', '$(Escape-Sql $asset.ObjectKey)', 'AUDIO', 'audio/mpeg', '$(Escape-Sql $asset.OriginalFilename)', $($asset.FileSize), '$($asset.Checksum)', 'SIGNED_URL', 'READY', '$adminId', NOW(), NOW());")
}
foreach ($topic in $topicRecords) {
    $examYearSql = if ($null -eq $topic.ExamYear) { 'NULL' } else { [string]$topic.ExamYear }
    $sql.Add("INSERT INTO question_sets (id, part_id, task_type_id, topic_id, code, title, hotness, exam_year, access_level, status, current_revision, item_count, max_score, published_at, created_by, updated_by, created_at, updated_at) VALUES ('$($topic.QuestionSetId)', '$partId', '$taskTypeId', '$($topic.TopicId)', '$($topic.Code)', '$(Escape-Sql $topic.Title)', $($topic.Hotness), $examYearSql, 'PREMIUM', 'PUBLISHED', 1, 4, 8.00, NOW(), '$adminId', '$adminId', NOW(), NOW());")
}
$sql.Add('COMMIT;')
try {
    Invoke-MySql $sql
} catch {
    docker exec aptis-mongo mongosh aptis --quiet --eval "db.question_set_documents.deleteMany({partId:'$partId'})" | Out-Host
    throw
}

if (-not $KeepDownloads) { Clear-DownloadDirectory }

Write-Host 'Imported 38 Listening Part 3 topics, 152 ordered items, and 38 shared audio files.'
