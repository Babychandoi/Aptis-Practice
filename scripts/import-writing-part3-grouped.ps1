[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\writting\part 3\aptis_writing_part3_grouped_by_set.json'
)

$ErrorActionPreference = 'Stop'
$partId = '16000000-0000-4000-8000-000000000043'
$taskTypeId = '12000000-0000-4000-8000-000000000009'
$rubricCode = 'APTIS_WRITING_PART_3_V1'
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
if ([int]$root.part -ne 3 -or [string]$root.skill -cne 'writing') { throw 'Source is not Writing Part 3.' }
if ([int]$root.set_count -ne 46 -or $sets.Count -ne 46 -or [int]$root.question_count -ne 138 -or $questions.Count -ne 138) {
    throw 'Unexpected Writing Part 3 totals.'
}
if ([int]$root.questions_per_set -ne 3) { throw 'Writing Part 3 must contain three prompts per set.' }
if (($sets.set_id | Select-Object -Unique).Count -ne 46 -or ($questions.item_id | Select-Object -Unique).Count -ne 138) {
    throw 'Source IDs are not unique.'
}
for ($setIndex = 0; $setIndex -lt 46; $setIndex++) {
    $set = $sets[$setIndex]
    if ([int]$set.set_stt -ne ($setIndex + 1) -or @($set.questions).Count -ne 3) { throw "Invalid set $($setIndex + 1)." }
    for ($itemIndex = 0; $itemIndex -lt 3; $itemIndex++) {
        $question = $set.questions[$itemIndex]
        if ([int]$question.question_order -ne ($itemIndex + 1) -or [int]$question.global_number -ne ($setIndex * 3 + $itemIndex + 1)) {
            throw "Question order changed in set $($set.set_stt)."
        }
    }
}

$topicNames = @(
    'Travel and the environment', 'Outdoor activities', 'News and public speaking', 'Books and reading',
    'Housing and historic buildings', 'Objects, courses and street art', 'Film club', 'College course experience',
    'Writing habits', 'Learning English', 'Television habits', 'Neighbours and eco-friendly homes',
    'Gardening and seasons', 'Food and healthy choices', 'Learning foreign languages', 'English club meetings',
    'Cinema and modern films', 'Nature trips and tourism', 'Playing sports', 'Books and reading habits',
    'English speaking club', 'Fashion and shopping', 'Photography skills', 'Computers and technology',
    'Small businesses', 'Museums and technology', 'Making and watching films', 'Using computers',
    'College life', 'English learning experience', 'Walking and exercise', 'Transport and volunteering',
    'Journeys and travel photos', 'Club membership', 'Travelling by car', 'Travel and the environment',
    'Friendship', 'Homes, neighbourhoods and heritage', 'Music and culture', 'Science club',
    'Exercise and technology', 'Fitness club', 'Exercise routines at work', 'Digital study and artificial intelligence',
    'Walking and pedestrian streets', 'Memorable meals and public health'
)
if ($topicNames.Count -ne 46) { throw 'Internal topic map must contain 46 names.' }

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Admin not found: $adminEmail" }
$existingCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingCount -ne 0) { throw "Writing Part 3 already contains $existingCount sets; stopped to avoid duplicates." }

$records = [Collections.Generic.List[object]]::new()
for ($setIndex = 0; $setIndex -lt 46; $setIndex++) {
    $set = $sets[$setIndex]
    $setNo = $setIndex + 1
    $questionSetId = [guid]::NewGuid().ToString()
    $topicId = [guid]::NewGuid().ToString()
    $topicName = $topicNames[$setIndex]
    $title = "Writing Part 3 - $topicName"
    $items = [Collections.Generic.List[object]]::new()
    for ($itemIndex = 0; $itemIndex -lt 3; $itemIndex++) {
        $question = $set.questions[$itemIndex]
        $constraints = [ordered]@{
            minWords = [int]$root.word_limit.min; maxWords = [int]$root.word_limit.max
            inputMode = 'CHAT_REPLY'; sourceSetId = [string]$set.set_id
            sourceItemId = [string]$question.item_id; sourceGlobalNumber = [int]$question.global_number
        }
        if (-not [string]::IsNullOrWhiteSpace([string]$question.speaker)) { $constraints.speaker = [string]$question.speaker }
        $items.Add([ordered]@{
            id = "item_$($itemIndex + 1)"; sequenceNo = $itemIndex + 1
            prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = [string]$question.prompt }
            responseType = 'LONG_TEXT'; required = $true; maxScore = 5
            options = @(); leftItems = @(); rightItems = @(); constraints = $constraints
            rubricCode = $rubricCode; answerKey = $null
        })
    }
    $document = [ordered]@{
        _id = $questionSetId; questionSetId = $questionSetId; revision = 1; schemaVersion = 1
        partId = $partId; taskTypeCode = 'LONG_TEXT'; title = $title
        instructions = 'Reply naturally to each group-chat message. Write 30 to 60 words for each answer.'
        accessLevel = 'PREMIUM'; sections = @(); items = @($items); assets = @()
        settings = [ordered]@{ shuffleOptions = $false; shuffleItems = $false; maxAudioPlays = $null; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'RUBRIC'; partialCredit = $true; maxScore = 15 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }
    $records.Add([pscustomobject]@{
        SetNo = $setNo; SourceSetId = [string]$set.set_id; QuestionSetId = $questionSetId; TopicId = $topicId
        Code = ('WRITING_PART_3_{0:D3}' -f $setNo); TopicCode = ('WRITING_P3_TOPIC_{0:D3}' -f $setNo)
        TopicName = $topicName; Title = $title; Document = $document
    })
}

$rubric = [ordered]@{
    _id = $rubricCode; code = $rubricCode; componentCode = 'WRITING'; partCode = 'PART_3'; version = 1; maxScore = 15
    criteria = @(
        [ordered]@{ code='TASK_ACHIEVEMENT'; name='Task achievement'; weight=0.20; maxScore=3; descriptors=[ordered]@{'0'='Does not address the messages.';'1.5'='Addresses some messages or ideas.';'3'='Addresses all messages directly and fully.'} },
        [ordered]@{ code='GRAMMAR'; name='Grammar'; weight=0.20; maxScore=3; descriptors=[ordered]@{'0'='Meaning is unclear because of grammar.';'1.5'='Uses basic structures with some errors.';'3'='Uses appropriate and accurate grammar.'} },
        [ordered]@{ code='VOCABULARY'; name='Vocabulary'; weight=0.20; maxScore=3; descriptors=[ordered]@{'0'='Vocabulary is inappropriate.';'1.5'='Vocabulary conveys the basic meaning.';'3'='Vocabulary is varied and natural.'} },
        [ordered]@{ code='COHESION'; name='Clarity and cohesion'; weight=0.20; maxScore=3; descriptors=[ordered]@{'0'='Ideas are unclear or disconnected.';'1.5'='Ideas are mostly clear with limited links.';'3'='Replies are clear and coherent.'} },
        [ordered]@{ code='REGISTER'; name='Interaction and register'; weight=0.20; maxScore=3; descriptors=[ordered]@{'0'='Replies are unsuitable for group chat.';'1.5'='Tone is partly suitable.';'3'='Tone is natural and appropriate throughout.'} }
    )
    status = 'ACTIVE'; createdAt = [DateTime]::UtcNow; updatedAt = [DateTime]::UtcNow
}

$documentsJson = @($records | ForEach-Object { $_.Document }) | ConvertTo-Json -Depth 14 -Compress
$rubricJson = $rubric | ConvertTo-Json -Depth 12 -Compress
$mongoScript = "const docs=$documentsJson; const rubric=$rubricJson; rubric.createdAt=new Date(); rubric.updatedAt=new Date(); if(db.question_set_documents.countDocuments({partId:'$partId'})>0) throw new Error('Writing Part 3 already exists'); db.rubric_definitions.replaceOne({code:'$rubricCode'},rubric,{upsert:true}); db.question_set_documents.insertMany(docs); print('Inserted '+docs.length+' Writing Part 3 documents');"
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
    $sql.Add("INSERT INTO question_sets (id,part_id,task_type_id,topic_id,code,title,hotness,exam_year,access_level,status,current_revision,item_count,max_score,published_at,created_by,updated_by,created_at,updated_at) VALUES ('$($record.QuestionSetId)','$partId','$taskTypeId','$($record.TopicId)','$($record.Code)',$titleSql,3,NULL,'PREMIUM','PUBLISHED',1,3,15.00,NOW(),'$adminId','$adminId',NOW(),NOW());")
}
$sql.Add('COMMIT;')
try {
    $sql | docker exec -e MYSQL_PWD=aptis -i aptis-mysql mysql -uaptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
} catch {
    docker exec aptis-mongo mongosh aptis --quiet --eval "db.question_set_documents.deleteMany({partId:'$partId'})" | Out-Host
    throw
}

Write-Host 'Imported 46 Writing Part 3 sets and 138 ordered prompts.'
