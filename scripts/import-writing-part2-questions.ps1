[CmdletBinding()]
param(
    [string]$SourceFile = 'D:\Aptis Practise\Aptis\writting\part 2\aptis_writing_part2_questions.json'
)

$ErrorActionPreference = 'Stop'
$partId = '16000000-0000-4000-8000-000000000042'
$taskTypeId = '12000000-0000-4000-8000-000000000009'
$rubricCode = 'APTIS_WRITING_PART_2_V1'
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
$questions = @($root.questions)
if ([int]$root.part -ne 2 -or [string]$root.skill -cne 'writing') { throw 'Source is not Writing Part 2.' }
if ([int]$root.question_count -ne 46 -or $questions.Count -ne 46 -or [int]$root.questions_per_block -ne 1) {
    throw 'Unexpected Writing Part 2 totals.'
}
if (($questions.question_id | Select-Object -Unique).Count -ne 46 -or ($questions.item_id | Select-Object -Unique).Count -ne 46) {
    throw 'Source IDs are not unique.'
}
for ($index = 0; $index -lt $questions.Count; $index++) {
    if ([int]$questions[$index].stt -ne ($index + 1) -or [int]$questions[$index].global_number -ne ($index + 1)) {
        throw "Question order changed at position $($index + 1)."
    }
}

$topicNames = @(
    'Travel interests', 'Clothes shopping', 'Free time and interests', 'Computer use',
    'Using foreign languages', 'Course schedule and study interests', 'Activities with friends', 'Outdoor activities',
    'Conversations with friends', 'Interest in science', 'Cooking course', 'Using English',
    'Improving English speaking', 'Free time and hobbies', 'Classes and suitable times', 'Film recommendation',
    'Going for a walk', 'A recently read book', 'Shopping places', 'Watching films',
    'Eating out', 'Photography', 'Writing experience', 'Using the Internet',
    'A frequently visited place', 'Favourite room at home', 'Using a laptop', 'Beautiful homes club',
    'Going for a run', 'Using English', 'Watching television', 'A favourite painting or photo',
    'Reason for joining a club', 'Outdoor activities', 'Favourite films', 'Museum visit',
    'Reason for joining a club', 'Listening to music', 'Research materials', 'Travelling by car',
    'Where you live', 'A healthy habit', 'A digital study tool', 'A recommended walking route',
    'Community activities', 'Eating out'
)
if ($topicNames.Count -ne 46) { throw 'Internal topic map must contain 46 names.' }

$adminId = (docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT id FROM aptis.users WHERE email='$adminEmail' LIMIT 1").Trim()
if ([string]::IsNullOrWhiteSpace($adminId)) { throw "Admin not found: $adminEmail" }
$existingCount = [int](docker exec -e MYSQL_PWD=aptis aptis-mysql mysql -uaptis -N -s -e "SELECT COUNT(*) FROM aptis.question_sets WHERE part_id='$partId'").Trim()
if ($existingCount -ne 0) { throw "Writing Part 2 already contains $existingCount sets; stopped to avoid duplicates." }

$records = [Collections.Generic.List[object]]::new()
for ($index = 0; $index -lt $questions.Count; $index++) {
    $question = $questions[$index]
    $setNo = $index + 1
    $questionSetId = [guid]::NewGuid().ToString()
    $topicId = [guid]::NewGuid().ToString()
    $topicName = $topicNames[$index]
    $title = "Writing Part 2 - $topicName"
    $constraints = [ordered]@{
        minWords = [int]$root.word_limit.min
        maxWords = [int]$root.word_limit.max
        inputMode = 'PARAGRAPH'
        sourceQuestionId = [string]$question.question_id
        sourceItemId = [string]$question.item_id
        sourceGlobalNumber = [int]$question.global_number
    }
    if (-not [string]::IsNullOrWhiteSpace([string]$question.embedded_word_instruction)) {
        $constraints.embeddedWordInstruction = [string]$question.embedded_word_instruction
    }
    $item = [ordered]@{
        id = 'item_1'; sequenceNo = 1
        prompt = [ordered]@{ format = 'PLAIN_TEXT'; value = [string]$question.question }
        responseType = 'LONG_TEXT'; required = $true; maxScore = 10
        options = @(); leftItems = @(); rightItems = @(); constraints = $constraints
        rubricCode = $rubricCode; answerKey = $null
    }
    $document = [ordered]@{
        _id = $questionSetId; questionSetId = $questionSetId; revision = 1; schemaVersion = 1
        partId = $partId; taskTypeCode = 'LONG_TEXT'; title = $title
        instructions = 'Viết câu trả lời thành câu hoàn chỉnh, từ 20 đến 40 từ.'
        accessLevel = 'PREMIUM'; sections = @(); items = @($item); assets = @()
        settings = [ordered]@{ shuffleOptions = $false; shuffleItems = $false; maxAudioPlays = $null; showAnswerAfterEachItem = $false; allowReview = $true }
        scoring = [ordered]@{ strategy = 'RUBRIC'; partialCredit = $true; maxScore = 10 }
        _class = 'vn.weconex.aptis.content.mongo.QuestionSetDocument'
    }
    $records.Add([pscustomobject]@{
        SetNo = $setNo; QuestionSetId = $questionSetId; TopicId = $topicId
        Code = ('WRITING_PART_2_{0:D3}' -f $setNo); TopicCode = ('WRITING_P2_TOPIC_{0:D3}' -f $setNo)
        TopicName = $topicName; Title = $title; SourceQuestionId = [string]$question.question_id; Document = $document
    })
}

$rubric = [ordered]@{
    _id = $rubricCode; code = $rubricCode; componentCode = 'WRITING'; partCode = 'PART_2'; version = 1; maxScore = 10
    criteria = @(
        [ordered]@{ code='TASK_ACHIEVEMENT'; name='Task achievement'; weight=0.30; maxScore=3; descriptors=[ordered]@{'0'='Không trả lời đúng yêu cầu.';'1.5'='Trả lời được một phần yêu cầu.';'3'='Trả lời trực tiếp và đầy đủ yêu cầu.'} },
        [ordered]@{ code='GRAMMAR'; name='Grammar'; weight=0.25; maxScore=2.5; descriptors=[ordered]@{'0'='Cấu trúc không rõ nghĩa.';'1.25'='Dùng được cấu trúc cơ bản nhưng còn lỗi.';'2.5'='Ngữ pháp phù hợp và chính xác.'} },
        [ordered]@{ code='VOCABULARY'; name='Vocabulary'; weight=0.25; maxScore=2.5; descriptors=[ordered]@{'0'='Từ vựng không phù hợp.';'1.25'='Từ vựng đủ diễn đạt ý cơ bản.';'2.5'='Từ vựng phù hợp và tự nhiên.'} },
        [ordered]@{ code='COHESION'; name='Clarity and cohesion'; weight=0.20; maxScore=2; descriptors=[ordered]@{'0'='Ý rời rạc hoặc không rõ.';'1'='Ý cơ bản rõ nhưng liên kết còn hạn chế.';'2'='Câu trả lời rõ ràng và mạch lạc.'} }
    )
    status = 'ACTIVE'; createdAt = [DateTime]::UtcNow; updatedAt = [DateTime]::UtcNow
}

$documentsJson = @($records | ForEach-Object { $_.Document }) | ConvertTo-Json -Depth 14 -Compress
$rubricJson = $rubric | ConvertTo-Json -Depth 12 -Compress
$mongoScript = "const docs=$documentsJson; const rubric=$rubricJson; rubric.createdAt=new Date(); rubric.updatedAt=new Date(); if(db.question_set_documents.countDocuments({partId:'$partId'})>0) throw new Error('Writing Part 2 already exists'); db.rubric_definitions.replaceOne({code:'$rubricCode'},rubric,{upsert:true}); db.question_set_documents.insertMany(docs); print('Inserted '+docs.length+' Writing Part 2 documents');"
$previousOutputEncoding = $OutputEncoding
$OutputEncoding = [Text.UTF8Encoding]::new($false)
try { $mongoScript | docker exec -i aptis-mongo mongosh aptis --quiet } finally { $OutputEncoding = $previousOutputEncoding }
if ($LASTEXITCODE -ne 0) { throw 'MongoDB import failed.' }

$sql = [Collections.Generic.List[string]]::new()
$sql.Add('START TRANSACTION;')
foreach ($record in $records) {
    $topicNameSql = ConvertTo-SqlUtf8Expression $record.TopicName
    $titleSql = ConvertTo-SqlUtf8Expression $record.Title
    $sql.Add("INSERT INTO topics (id,parent_id,code,name,description,is_active,created_at,updated_at) VALUES ('$($record.TopicId)',NULL,'$($record.TopicCode)',$topicNameSql,'Source question ID: $(Escape-Sql $record.SourceQuestionId)',1,NOW(),NOW());")
    $sql.Add("INSERT INTO question_sets (id,part_id,task_type_id,topic_id,code,title,hotness,exam_year,access_level,status,current_revision,item_count,max_score,published_at,created_by,updated_by,created_at,updated_at) VALUES ('$($record.QuestionSetId)','$partId','$taskTypeId','$($record.TopicId)','$($record.Code)',$titleSql,3,NULL,'PREMIUM','PUBLISHED',1,1,10.00,NOW(),'$adminId','$adminId',NOW(),NOW());")
}
$sql.Add('COMMIT;')
try {
    $sql | docker exec -e MYSQL_PWD=aptis -i aptis-mysql mysql -uaptis --default-character-set=utf8mb4 aptis
    if ($LASTEXITCODE -ne 0) { throw 'MySQL import failed.' }
} catch {
    docker exec aptis-mongo mongosh aptis --quiet --eval "db.question_set_documents.deleteMany({partId:'$partId'})" | Out-Host
    throw
}

Write-Host 'Imported 46 Writing Part 2 sets and 46 ordered prompts.'
