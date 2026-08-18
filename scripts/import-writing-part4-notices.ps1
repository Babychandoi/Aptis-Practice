[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\writting\part 4\aptis_writing_part4_grouped_by_notice.json'
)

$ErrorActionPreference = 'Stop'
$partId = '16000000-0000-4000-8000-000000000044'
$taskTypeId = '12000000-0000-4000-8000-000000000009'
$rubricCode = 'APTIS_WRITING_PART_4_V1'
$adminEmail = 'plat-admin@test.local'

function Escape-Sql([string]$Value) {
    if ($null -eq $Value) { return '' }
    return $Value.Replace("'", "''")
}

function ConvertTo-SqlUtf8Expression([string]$Value) {
    $hex = ([BitConverter]::ToString([Text.Encoding]::UTF8.GetBytes($Value))).Replace('-', '')
    return "CONVERT(0x$hex USING utf8mb4)"
}

function ConvertTo-NoticeHtml([string]$Title, [string]$Body) {
    $encodedTitle = [Net.WebUtility]::HtmlEncode($Title)
    $encodedBody = [Net.WebUtility]::HtmlEncode($Body).Replace("`r`n", '<br>').Replace("`n", '<br>')
    return "<h4>$encodedTitle</h4><p>$encodedBody</p>"
}

if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) { throw "Source file not found: $SourceFile" }
$root = Get-Content -LiteralPath $SourceFile -Raw -Encoding utf8 | ConvertFrom-Json
$sets = @($root.sets)
$questions = @($sets | ForEach-Object { @($_.questions) })
if ([int]$root.part -ne 4 -or [string]$root.skill -cne 'writing') { throw 'Source is not Writing Part 4.' }
if ([int]$root.set_count -ne 46 -or $sets.Count -ne 46 -or [int]$root.question_count -ne 92 -or $questions.Count -ne 92) {
    throw 'Unexpected Writing Part 4 totals.'
}
if ([int]$root.questions_per_set -ne 2) { throw 'Writing Part 4 must contain two emails per set.' }
if (($sets.set_id | Select-Object -Unique).Count -ne 46 -or ($questions.item_id | Select-Object -Unique).Count -ne 92) {
    throw 'Source IDs are not unique.'
}
for ($setIndex = 0; $setIndex -lt 46; $setIndex++) {
    $set = $sets[$setIndex]
    if ([int]$set.set_stt -ne ($setIndex + 1) -or @($set.questions).Count -ne 2) { throw "Invalid set $($setIndex + 1)." }
    if ([string]::IsNullOrWhiteSpace([string]$set.notice.title) -or [string]::IsNullOrWhiteSpace([string]$set.notice.body)) {
        throw "Set $($set.set_stt) has no complete notice."
    }
    for ($itemIndex = 0; $itemIndex -lt 2; $itemIndex++) {
        $question = $set.questions[$itemIndex]
        $expectedType = if ($itemIndex -eq 0) { 'informal' } else { 'formal' }
        $expectedMin = if ($itemIndex -eq 0) { 40 } else { 120 }
        $expectedMax = if ($itemIndex -eq 0) { 75 } else { 225 }
        if ([int]$question.question_order -ne ($itemIndex + 1) -or [int]$question.global_number -ne ($setIndex * 2 + $itemIndex + 1)) {
            throw "Question order changed in set $($set.set_stt)."
        }
        if ([string]$question.email_type -cne $expectedType -or [int]$question.word_limit.min -ne $expectedMin -or [int]$question.word_limit.max -ne $expectedMax) {
            throw "Invalid email type or word limit in set $($set.set_stt), item $($itemIndex + 1)."
        }
    }
}

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Admin not found: $adminEmail" }
$existingCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingCount -ne 0) { throw "Writing Part 4 already contains $existingCount sets; stopped to avoid duplicates." }

$records = [Collections.Generic.List[object]]::new()
for ($setIndex = 0; $setIndex -lt 46; $setIndex++) {
    $set = $sets[$setIndex]
    $setNo = $setIndex + 1
    $questionSetId = [guid]::NewGuid().ToString()
    $topicId = [guid]::NewGuid().ToString()
    $topicName = [string]$set.notice.title
    $items = [Collections.Generic.List[object]]::new()
    for ($itemIndex = 0; $itemIndex -lt 2; $itemIndex++) {
        $question = $set.questions[$itemIndex]
        $emailType = [string]$question.email_type
        $constraints = [ordered]@{
            minWords = [int]$question.word_limit.min; maxWords = [int]$question.word_limit.max
            inputMode = 'EMAIL'; register = $emailType; emailType = $emailType
            sourceSetId = [string]$set.set_id; sourceItemId = [string]$question.item_id
            sourceGlobalNumber = [int]$question.global_number
        }
        if (-not [string]::IsNullOrWhiteSpace([string]$question.embedded_word_instruction)) {
            $constraints.embeddedWordInstruction = [string]$question.embedded_word_instruction
        }
        $items.Add([ordered]@{
            id = "item_$($itemIndex + 1)"; sequenceNo = $itemIndex + 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = [string]$question.prompt }
            responseType = 'LONG_TEXT'; required = $true; maxScore = $(if ($emailType -eq 'informal') { 5 } else { 15 })
            options = @(); leftItems = @(); rightItems = @(); constraints = $constraints
            rubricCode = $rubricCode; answerKey = $null
        })
    }
    $document = [ordered]@{
        _id = $questionSetId; questionSetId = $questionSetId; revision = 1; schemaVersion = 1
        partId = $partId; taskTypeCode = 'LONG_TEXT'; title = $topicName
        instructions = 'Read the club notice, then write one informal email and one formal email.'
        stimulus = [ordered]@{ type = 'RICH_TEXT'; format = 'HTML'; value = (ConvertTo-NoticeHtml $set.notice.title $set.notice.body) }
        accessLevel = 'PREMIUM'; sections = @(); items = @($items); assets = @()
        settings = [ordered]@{ shuffleOptions = $false; shuffleItems = $false; maxAudioPlays = $null; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'RUBRIC'; partialCredit = $true; maxScore = 20 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }
    $records.Add([pscustomobject]@{
        SetNo = $setNo; SourceSetId = [string]$set.set_id; QuestionSetId = $questionSetId; TopicId = $topicId
        Code = ('WRITING_PART_4_{0:D3}' -f $setNo); TopicCode = ('WRITING_P4_NOTICE_{0:D3}' -f $setNo)
        TopicName = $topicName; Title = $topicName; Document = $document
    })
}

$rubric = [ordered]@{
    _id = $rubricCode; code = $rubricCode; componentCode = 'WRITING'; partCode = 'PART_4'; version = 1; maxScore = 20
    criteria = @(
        [ordered]@{ code='TASK_ACHIEVEMENT'; name='Task achievement'; weight=0.20; maxScore=4; descriptors=[ordered]@{'0'='Does not address the notice.';'2'='Addresses some required points.';'4'='Addresses all required points in both emails.'} },
        [ordered]@{ code='GRAMMAR'; name='Grammar'; weight=0.20; maxScore=4; descriptors=[ordered]@{'0'='Meaning is unclear because of grammar.';'2'='Uses basic structures with some errors.';'4'='Uses varied and accurate grammar.'} },
        [ordered]@{ code='VOCABULARY'; name='Vocabulary'; weight=0.20; maxScore=4; descriptors=[ordered]@{'0'='Vocabulary is inappropriate.';'2'='Vocabulary conveys the basic meaning.';'4'='Vocabulary is varied, precise and natural.'} },
        [ordered]@{ code='COHESION'; name='Cohesion and coherence'; weight=0.20; maxScore=4; descriptors=[ordered]@{'0'='Ideas are unclear or disconnected.';'2'='Organisation is mostly clear.';'4'='Both emails are organised and coherent.'} },
        [ordered]@{ code='REGISTER'; name='Register and tone'; weight=0.20; maxScore=4; descriptors=[ordered]@{'0'='Register is unsuitable.';'2'='Register is partly appropriate.';'4'='Informal and formal registers are consistently appropriate.'} }
    )
    status = 'ACTIVE'; createdAt = [DateTime]::UtcNow; updatedAt = [DateTime]::UtcNow
}

$documentsJson = @($records | ForEach-Object { $_.Document }) | ConvertTo-Json -Depth 14 -Compress
$rubricJson = $rubric | ConvertTo-Json -Depth 12 -Compress
$mongoScript = "const docs=$documentsJson; const rubric=$rubricJson; rubric.createdAt=new Date(); rubric.updatedAt=new Date(); if(db.question_set_documents.countDocuments({partId:'$partId'})>0) throw new Error('Writing Part 4 already exists'); db.rubric_definitions.replaceOne({code:'$rubricCode'},rubric,{upsert:true}); db.question_set_documents.insertMany(docs); print('Inserted '+docs.length+' Writing Part 4 documents');"
$previousOutputEncoding = $OutputEncoding
$OutputEncoding = [Text.UTF8Encoding]::new($false)
try { $mongoScript | docker exec -i aptis-mongo mongosh aptis --quiet } finally { $OutputEncoding = $previousOutputEncoding }
if ($LASTEXITCODE -ne 0) { throw 'MongoDB import failed.' }

$sql = [Collections.Generic.List[string]]::new()
$sql.Add('START TRANSACTION;')
foreach ($record in $records) {
    $topicNameSql = ConvertTo-SqlUtf8Expression $record.TopicName
    $titleSql = ConvertTo-SqlUtf8Expression $record.Title
    $sql.Add("INSERT INTO topics (id,parent_id,code,name,description,is_active,created_at,updated_at) VALUES ('$($record.TopicId)',NULL,'$($record.TopicCode)',$topicNameSql,'Source set ID: $(Escape-Sql $record.SourceSetId)',1,NOW(),NOW());")
    $sql.Add("INSERT INTO question_sets (id,part_id,task_type_id,topic_id,code,title,hotness,exam_year,access_level,status,current_revision,item_count,max_score,published_at,created_by,updated_by,created_at,updated_at) VALUES ('$($record.QuestionSetId)','$partId','$taskTypeId','$($record.TopicId)','$($record.Code)',$titleSql,3,NULL,'PREMIUM','PUBLISHED',1,2,20.00,NOW(),'$adminId','$adminId',NOW(),NOW());")
}
$sql.Add('COMMIT;')
try {
    $sql | docker exec -e MYSQL_PWD=aptis -i aptis-mysql mysql -uaptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
} catch {
    docker exec aptis-mongo mongosh aptis --quiet --eval "db.question_set_documents.deleteMany({partId:'$partId'})" | Out-Host
    throw
}

Write-Host 'Imported 46 Writing Part 4 notices and 92 ordered email prompts.'
