[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\listenning\part 4\aptis_listening_part4_grouped_by_topic.json',
    [switch]$KeepDownloads
)

$ErrorActionPreference = 'Stop'
$partId = '16000000-0000-4000-8000-000000000024'
$taskTypeId = '12000000-0000-4000-8000-000000000001'
$taskTypeCode = 'SINGLE_CHOICE'
$bucket = 'aptis-content'
$objectPrefix = 'content/import/listening-part4-grouped'
$adminEmail = 'plat-admin@test.local'
$downloadDirectory = Join-Path (Split-Path -Parent $SourceFile) '.import-listening-part4-grouped'

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
    return [regex]::Replace($Title.Replace($fire, ''), '\s+', ' ').Trim()
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
    throw "Source file not found: $SourceFile"
}

$root = Get-Content -LiteralPath $SourceFile -Raw -Encoding utf8 | ConvertFrom-Json
$topics = @($root.topics)
$questions = @($topics | ForEach-Object { @($_.questions) })
if ([int]$root.part -ne 4) { throw "Expected Part 4, found Part $($root.part)." }
if ($topics.Count -ne 60) { throw "Expected 60 topics, found $($topics.Count)." }
if ($questions.Count -ne 120) { throw "Expected 120 questions, found $($questions.Count)." }
if (($questions.question_id | Select-Object -Unique).Count -ne 120) { throw 'Question ID is not unique.' }
if (($topics.audio_url | Select-Object -Unique).Count -ne 60) { throw 'Audio URL is not unique.' }

for ($topicIndex = 0; $topicIndex -lt $topics.Count; $topicIndex++) {
    $topic = $topics[$topicIndex]
    if ([int]$topic.topic_stt -ne ($topicIndex + 1)) { throw "Topic order changed at index $topicIndex." }
    $topicQuestions = @($topic.questions)
    if ($topicQuestions.Count -ne 2) { throw "Topic $($topic.topic_stt) must contain two questions." }
    $displayPrefix = ([string]$topicQuestions[0].display_no).Split('.')[0]
    if (-not (@('16', '17') -ccontains $displayPrefix)) {
        throw "Unexpected display number at topic $($topic.topic_stt)."
    }
    for ($questionIndex = 0; $questionIndex -lt 2; $questionIndex++) {
        $question = $topicQuestions[$questionIndex]
        $expectedDisplayNo = "$displayPrefix.$($questionIndex + 1)"
        if ([string]$question.display_no -cne $expectedDisplayNo) {
            throw "Question order is invalid at topic $($topic.topic_stt): expected $expectedDisplayNo."
        }
        $options = @($question.options)
        if ($options.Count -ne 3 -or (@($options.letter) -join '') -cne 'ABC') {
            throw "Options are not ordered A/B/C at topic $($topic.topic_stt), $expectedDisplayNo."
        }
        $correct = @($options | Where-Object { [string]$_.letter -ceq [string]$question.correct_letter })
        if ($correct.Count -ne 1 -or [string]$correct[0].text -cne [string]$question.correct_answer) {
            throw "Correct answer mismatch at topic $($topic.topic_stt), $expectedDisplayNo."
        }
    }
}

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Admin not found: $adminEmail" }
$existingCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingCount -ne 0) { throw "Listening Part 4 already contains $existingCount sets; stopped to avoid duplicates." }

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
    $cleanTitle = if ([int]$titleTotals[$baseTitle] -gt 1) { "$baseTitle - Bộ $($titleSeen[$baseTitle])" } else { $baseTitle }
    $hotness = Get-Hotness ([string]$topic.topic)
    $examYear = if (([string]$topic.topic -match '\(\s*2026\s*\)')) { 2026 } else { $null }

    $audioUri = [Uri]$topic.audio_url
    $originalFilename = [IO.Path]::GetFileName($audioUri.AbsolutePath)
    $localFilename = "$assetId.mp3"
    $localPath = Join-Path $downloadDirectory $localFilename
    Write-Host "[$topicNo/60] Downloading $cleanTitle - $originalFilename"
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
            if ($attempt -eq 3) { throw "Cannot download audio topic ${topicNo}: $($_.Exception.Message)" }
            Start-Sleep -Seconds ($attempt * 2)
        }
    }

    $items = [Collections.Generic.List[object]]::new()
    for ($itemIndex = 0; $itemIndex -lt 2; $itemIndex++) {
        $question = $topic.questions[$itemIndex]
        $optionObjects = [Collections.Generic.List[object]]::new()
        foreach ($option in @($question.options)) {
            $optionObjects.Add([ordered]@{ id = [string]$option.letter; code = [string]$option.letter; content = [string]$option.text })
        }
        $items.Add([ordered]@{
            id = "item_$($itemIndex + 1)"
            sequenceNo = $itemIndex + 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = [string]$question.question }
            responseType = 'SINGLE_CHOICE'
            required = $true
            maxScore = 2
            options = @($optionObjects)
            leftItems = @()
            rightItems = @()
            constraints = [ordered]@{ sourceQuestionId = [string]$question.question_id; sourceDisplayNo = [string]$question.display_no }
            answerKey = [ordered]@{
                type = 'SINGLE_CHOICE'; selectedOptionId = [string]$question.correct_letter
                selectedOptionIds = @(); matches = [ordered]@{}; orderedOptionIds = @(); acceptedValues = @(); caseSensitive = $false
            }
        })
    }

    $document = [ordered]@{
        _id = $questionSetId; questionSetId = $questionSetId; revision = 1; schemaVersion = 1
        partId = $partId; taskTypeCode = $taskTypeCode; title = $cleanTitle
        instructions = 'Nghe bài nói và chọn đáp án đúng cho mỗi câu hỏi.'
        accessLevel = 'PREMIUM'; sections = @(); items = @($items)
        assets = @([ordered]@{ assetId = $assetId; role = 'MAIN_AUDIO'; displayOrder = 1 })
        settings = [ordered]@{ shuffleOptions = $false; shuffleItems = $false; maxAudioPlays = 2; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'EXACT_MATCH'; partialCredit = $false; maxScore = 4 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }
    $topicRecords.Add([pscustomobject]@{
        TopicNo = $topicNo; TopicId = $topicId; QuestionSetId = $questionSetId
        Code = ('LISTENING_PART_4_{0:D3}' -f $topicNo); TopicCode = ('LISTENING_P4_TOPIC_{0:D3}' -f $topicNo)
        Title = $cleanTitle; Hotness = $hotness; ExamYear = $examYear; Document = $document
    })
    $audioRecords.Add([pscustomobject]@{
        AssetId = $assetId; OriginalFilename = $originalFilename; LocalFilename = $localFilename; LocalPath = $localPath
        FileSize = (Get-Item -LiteralPath $localPath).Length
        Checksum = (Get-FileHash -LiteralPath $localPath -Algorithm SHA256).Hash.ToLowerInvariant()
        ObjectKey = "$objectPrefix/$localFilename"
    })
}

Write-Host 'Uploading 60 shared audio files to MinIO...'
# A previous interrupted run may leave this exact temporary path behind. Remove
# it before docker cp so the source directory cannot become nested on retry.
docker exec aptis-minio rm -rf /tmp/listening-part4-grouped
docker cp $downloadDirectory 'aptis-minio:/tmp/listening-part4-grouped'
if ($LASTEXITCODE -ne 0) { throw 'Cannot copy audio to MinIO container.' }
docker exec aptis-minio sh -c "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc mirror /tmp/listening-part4-grouped local/$bucket/$objectPrefix"
if ($LASTEXITCODE -ne 0) { throw 'MinIO upload failed.' }
docker exec aptis-minio rm -rf /tmp/listening-part4-grouped

$documentsJson = @($topicRecords | ForEach-Object { $_.Document }) | ConvertTo-Json -Depth 14 -Compress
$mongoScript = "const docs=$documentsJson; if (db.question_set_documents.countDocuments({partId:'$partId'})>0) throw new Error('Listening Part 4 documents already exist'); db.question_set_documents.insertMany(docs); print('Inserted '+docs.length+' Listening Part 4 documents');"
$previousOutputEncoding = $OutputEncoding
$OutputEncoding = [Text.UTF8Encoding]::new($false)
try { $mongoScript | docker exec -i aptis-mongo mongosh aptis --quiet } finally { $OutputEncoding = $previousOutputEncoding }
if ($LASTEXITCODE -ne 0) { throw 'MongoDB document import failed.' }

$sql = [Collections.Generic.List[string]]::new()
$sql.Add('START TRANSACTION;')
foreach ($topic in $topicRecords) {
    $sql.Add("INSERT INTO topics (id,parent_id,code,name,description,is_active,created_at,updated_at) VALUES ('$($topic.TopicId)',NULL,'$($topic.TopicCode)','$(Escape-Sql $topic.Title)',NULL,1,NOW(),NOW());")
}
foreach ($asset in $audioRecords) {
    $sql.Add("INSERT INTO assets (id,bucket_name,object_key,asset_type,mime_type,original_filename,file_size,checksum_sha256,access_scope,status,created_by,created_at,updated_at) VALUES ('$($asset.AssetId)','$bucket','$(Escape-Sql $asset.ObjectKey)','AUDIO','audio/mpeg','$(Escape-Sql $asset.OriginalFilename)',$($asset.FileSize),'$($asset.Checksum)','SIGNED_URL','READY','$adminId',NOW(),NOW());")
}
foreach ($topic in $topicRecords) {
    $examYearSql = if ($null -eq $topic.ExamYear) { 'NULL' } else { [string]$topic.ExamYear }
    $sql.Add("INSERT INTO question_sets (id,part_id,task_type_id,topic_id,code,title,hotness,exam_year,access_level,status,current_revision,item_count,max_score,published_at,created_by,updated_by,created_at,updated_at) VALUES ('$($topic.QuestionSetId)','$partId','$taskTypeId','$($topic.TopicId)','$($topic.Code)','$(Escape-Sql $topic.Title)',$($topic.Hotness),$examYearSql,'PREMIUM','PUBLISHED',1,2,4.00,NOW(),'$adminId','$adminId',NOW(),NOW());")
}
$sql.Add('COMMIT;')
try { Invoke-MySql $sql } catch {
    docker exec aptis-mongo mongosh aptis --quiet --eval "db.question_set_documents.deleteMany({partId:'$partId'})" | Out-Host
    throw
}

if (-not $KeepDownloads) { Clear-DownloadDirectory }
Write-Host 'Imported 60 Listening Part 4 topics, 120 ordered items, and 60 shared audio files.'
