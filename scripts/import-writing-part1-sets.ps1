[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\writting\part 1\aptis_writing_part1_grouped_by_set.json'
)

$ErrorActionPreference = 'Stop'
$partId = '16000000-0000-4000-8000-000000000041'
$taskTypeId = '12000000-0000-4000-8000-000000000009'
$taskTypeCode = 'LONG_TEXT'
$rubricCode = 'APTIS_WRITING_PART_1_V1'
$adminEmail = 'plat-admin@test.local'

function Escape-Sql([string]$Value) {
    if ($null -eq $Value) { return '' }
    return $Value.Replace("'", "''")
}

function ConvertTo-SqlUtf8Expression([string]$Value) {
    $hex = ([BitConverter]::ToString([Text.Encoding]::UTF8.GetBytes($Value))).Replace('-', '')
    return "CONVERT(0x$hex USING utf8mb4)"
}

if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) { throw "Source file not found: $SourceFile" }
$root = Get-Content -LiteralPath $SourceFile -Raw -Encoding utf8 | ConvertFrom-Json
$sets = @($root.sets)
$questions = @($sets | ForEach-Object { @($_.questions) })
if ([int]$root.part -ne 1 -or [string]$root.skill -cne 'writing') { throw 'Source is not Writing Part 1.' }
if ($sets.Count -ne 46 -or $questions.Count -ne 230) { throw 'Unexpected source totals.' }
if (($sets.set_id | Select-Object -Unique).Count -ne 46 -or ($questions.item_id | Select-Object -Unique).Count -ne 230) { throw 'Source IDs are not unique.' }
for ($setIndex = 0; $setIndex -lt 46; $setIndex++) {
    $set = $sets[$setIndex]
    if ([int]$set.set_stt -ne ($setIndex + 1) -or @($set.questions).Count -ne 5) { throw "Invalid set $($setIndex + 1)." }
    for ($itemIndex = 0; $itemIndex -lt 5; $itemIndex++) {
        $question = $set.questions[$itemIndex]
        if ([int]$question.question_order -ne ($itemIndex + 1) -or [int]$question.global_number -ne ($setIndex * 5 + $itemIndex + 1)) {
            throw "Question order changed in set $($set.set_stt)."
        }
    }
}

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Admin not found: $adminEmail" }
$existingCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingCount -ne 0) { throw "Writing Part 1 already contains $existingCount sets; stopped to avoid duplicates." }

$records = [Collections.Generic.List[object]]::new()
foreach ($set in $sets) {
    $setNo = [int]$set.set_stt
    $questionSetId = [guid]::NewGuid().ToString()
    $topicId = [guid]::NewGuid().ToString()
    $title = "Writing Part 1 - Bộ $setNo"
    $items = [Collections.Generic.List[object]]::new()
    for ($itemIndex = 0; $itemIndex -lt 5; $itemIndex++) {
        $question = $set.questions[$itemIndex]
        $items.Add([ordered]@{
            id = "item_$($itemIndex + 1)"
            sequenceNo = $itemIndex + 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = [string]$question.question }
            responseType = 'LONG_TEXT'
            required = $true
            maxScore = 1
            options = @(); leftItems = @(); rightItems = @()
            constraints = [ordered]@{
                minWords = [int]$root.word_limit.min; maxWords = [int]$root.word_limit.max
                inputMode = 'SHORT'; sourceItemId = [string]$question.item_id
                sourceGlobalNumber = [int]$question.global_number
            }
            rubricCode = $rubricCode
            answerKey = $null
        })
    }
    $document = [ordered]@{
        _id = $questionSetId; questionSetId = $questionSetId; revision = 1; schemaVersion = 1
        partId = $partId; taskTypeCode = $taskTypeCode; title = $title
        instructions = 'Điền biểu mẫu bằng câu trả lời ngắn. Mỗi câu trả lời từ 1 đến 15 từ.'
        accessLevel = 'PREMIUM'; sections = @(); items = @($items); assets = @()
        settings = [ordered]@{ shuffleOptions = $false; shuffleItems = $false; maxAudioPlays = $null; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'RUBRIC'; partialCredit = $true; maxScore = 5 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }
    $records.Add([pscustomobject]@{
        SetNo = $setNo; SourceSetId = [string]$set.set_id; TopicId = $topicId; QuestionSetId = $questionSetId
        Code = ('WRITING_PART_1_{0:D3}' -f $setNo); TopicCode = ('WRITING_P1_SET_{0:D3}' -f $setNo)
        Title = $title; Document = $document
    })
}

$rubric = [ordered]@{
    _id = $rubricCode; code = $rubricCode; componentCode = 'WRITING'; partCode = 'PART_1'; version = 1; maxScore = 5
    criteria = @(
        [ordered]@{ code='TASK_ACHIEVEMENT'; name='Task achievement'; weight=0.30; maxScore=1.5; descriptors=[ordered]@{'0'='Không trả lời đúng yêu cầu.';'1.5'='Trả lời trực tiếp và đầy đủ yêu cầu.'} },
        [ordered]@{ code='GRAMMAR'; name='Grammar'; weight=0.25; maxScore=1.25; descriptors=[ordered]@{'0'='Cấu trúc không rõ nghĩa.';'1.25'='Cấu trúc ngữ pháp phù hợp và chính xác.'} },
        [ordered]@{ code='VOCABULARY'; name='Vocabulary'; weight=0.25; maxScore=1.25; descriptors=[ordered]@{'0'='Từ vựng không phù hợp.';'1.25'='Từ vựng phù hợp với câu hỏi.'} },
        [ordered]@{ code='COHESION'; name='Clarity'; weight=0.10; maxScore=0.5; descriptors=[ordered]@{'0'='Ý không rõ.';'0.5'='Câu trả lời rõ ràng.'} },
        [ordered]@{ code='REGISTER'; name='Appropriacy'; weight=0.10; maxScore=0.5; descriptors=[ordered]@{'0'='Cách diễn đạt không phù hợp.';'0.5'='Cách diễn đạt tự nhiên và phù hợp.'} }
    )
    status = 'ACTIVE'; createdAt = [DateTime]::UtcNow; updatedAt = [DateTime]::UtcNow
}
$documentsJson = @($records | ForEach-Object { $_.Document }) | ConvertTo-Json -Depth 14 -Compress
$rubricJson = $rubric | ConvertTo-Json -Depth 12 -Compress
$mongoScript = "const docs=$documentsJson; const rubric=$rubricJson; rubric.createdAt=new Date(); rubric.updatedAt=new Date(); if(db.question_set_documents.countDocuments({partId:'$partId'})>0) throw new Error('Writing Part 1 already exists'); db.rubric_definitions.replaceOne({code:'$rubricCode'},rubric,{upsert:true}); db.question_set_documents.insertMany(docs); print('Inserted '+docs.length+' Writing Part 1 documents');"
$previousOutputEncoding = $OutputEncoding
$OutputEncoding = [Text.UTF8Encoding]::new($false)
try { $mongoScript | docker exec -i aptis-mongo mongosh aptis --quiet } finally { $OutputEncoding = $previousOutputEncoding }
if ($LASTEXITCODE -ne 0) { throw 'MongoDB import failed.' }

$sql = [Collections.Generic.List[string]]::new()
$sql.Add('START TRANSACTION;')
foreach ($record in $records) {
    $titleSql = ConvertTo-SqlUtf8Expression $record.Title
    $sql.Add("INSERT INTO topics (id,parent_id,code,name,description,is_active,created_at,updated_at) VALUES ('$($record.TopicId)',NULL,'$($record.TopicCode)',$titleSql,'Source set ID: $(Escape-Sql $record.SourceSetId)',1,NOW(),NOW());")
    $sql.Add("INSERT INTO question_sets (id,part_id,task_type_id,topic_id,code,title,hotness,exam_year,access_level,status,current_revision,item_count,max_score,published_at,created_by,updated_by,created_at,updated_at) VALUES ('$($record.QuestionSetId)','$partId','$taskTypeId','$($record.TopicId)','$($record.Code)',$titleSql,3,NULL,'PREMIUM','PUBLISHED',1,5,5.00,NOW(),'$adminId','$adminId',NOW(),NOW());")
}
$sql.Add('COMMIT;')
try {
    $sql | docker exec -e MYSQL_PWD=aptis -i aptis-mysql mysql -uaptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
} catch {
    docker exec aptis-mongo mongosh aptis --quiet --eval "db.question_set_documents.deleteMany({partId:'$partId'})" | Out-Host
    throw
}
Write-Host 'Imported 46 Writing Part 1 sets and 230 ordered prompts.'
