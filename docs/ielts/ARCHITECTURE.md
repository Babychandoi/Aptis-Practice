# IELTS Practice — architecture and API

## Reuse and separation

Independent React 19 frontend communicates with `/api/v1/ielts`. The existing Spring Boot 3.3 / Java 17 backend supplies JWT/refresh-cookie identity, RBAC, MySQL user metadata and entitlements, and MinIO asset storage. IELTS owns MongoDB `ielts_exams` and `ielts_attempts`. React renders text as text, not untrusted HTML. Base account endpoints remain `/api/v1/auth/*` and `/api/v1/me`.

Runtime namespace, databases, volumes and buckets are separated with `docker-compose.ielts.yml` and profile `ielts`. Export script creates a portable standalone checkout without the Aptis learner application. The legacy backend package name is an implementation compatibility choice, not shared runtime data.

## Model

`Exam`: UUID, optimistic version, title, track, fullLength, premium, published, authorId, groups, updatedAt.

`Group`: unique id, skill, part (or Writing task), title, instructions, shared passage, optional MinIO assetId, questions.

`Question`: unique id, response type, prompt, options, private accepted answer key, private explanation, word/recording constraints.

`Attempt`: UUID, version, owner userId, examId/author snapshot, immutable content snapshot, responses, active skill/deadline, submitted skills, reviews and status.

Attempt status: `IN_PROGRESS → PENDING_REVIEW → COMPLETED`, or straight to `COMPLETED` for receptive-only exercises. Snapshot content includes server-only answers; public question DTOs have no answer fields. Revisions affect future attempts only. Optimistic version protects every Mongo update. Autosaves are serialized on the client; conflict returns 409. Skill submissions are idempotent after that skill is persisted as submitted.

The start call creates one new attempt per request; retries are not idempotent. The UI disables repeated start requests while pending.

## API

All IELTS endpoints require authenticated JWT. Author/review actions additionally check teacher/admin role and exam ownership in the service.

| Method | Path under `/api/v1/ielts` | Purpose |
|---|---|---|
| GET | `/exams?track=ACADEMIC&page=0` | Published metadata, 24 per page, no answers |
| GET | `/author/exams?page=0` | Author's editable exams, including private answer keys |
| POST | `/author/exams` | Create validated exam; ignore client identity/author fields |
| PUT | `/author/exams/{id}` | Update own exam; require current version |
| POST | `/attempts` | `{ "examId": "..." }`; check publication and Premium |
| GET | `/attempts?page=0` | Owner's history, 24 per page |
| GET | `/attempts/{id}` | Restore owner attempt and current skill |
| PUT | `/attempts/{id}/responses` | `{ "version": 0, "responses": { "q1": { "text": "..." } } }` |
| POST | `/attempts/{id}/submit-skill` | `{ "skill": "READING" }`; lock skill and advance |
| GET | `/attempts/{id}/media/{assetId}` | Signed URL only for assets referenced in owner attempt |
| GET | `/review/queue?page=0` | Pending owner-author exams; admin sees all |
| GET | `/review/{id}` | Authorized detail of one submitted attempt |
| PUT | `/review/{id}/questions/{questionId}` | `{ "criteria": { ... }, "feedback": "..." }` |
| GET | `/review/{id}/media/{assetId}` | Recording/content URL after review authorization |

History and review lists return summaries without passages, responses or answer keys; detail is fetched only when opened. GET collections use Spring Page `{content,number,totalPages,...}`. Dates are UTC ISO-8601. No request may choose the owner, reviewer or author identity.

## Assets

Reuse `POST /api/v1/assets/upload-url`, direct presigned PUT and `POST /assets/{id}/complete`. Valid generic asset types from the base are `AUDIO`, `IMAGE` and `USER_RECORDING`. File upload completion verifies object existence/size before READY. IELTS authoring checks content file creator/type; responses check recording owner/type. Download URLs are requested through the IELTS media endpoints, which enforce attempt membership rather than the base Aptis question-set lookup.

## Rubrics and conversion

Writing Task 1: `taskAchievement`, `coherenceCohesion`, `lexicalResource`, `grammarAccuracy`.

Writing Task 2: `taskResponse`, `coherenceCohesion`, `lexicalResource`, `grammarAccuracy`.

Speaking: `fluencyCoherence`, `lexicalResource`, `grammarAccuracy`, `pronunciation`.

All four criterion keys must exist. Values must be finite, 0–9 in 0.5 increments. Reviewer ID and time come from the server. Writing formula `(Task1 mean + 2 × Task2 mean) / 3`, then practice rounding to 0.5. Speaking is the mean of question rubric means, rounded to 0.5; this intentionally remains labelled teacher estimate.

Raw-score boundaries in `IeltsScoring` are a practice table, not a universal official conversion. Representative anchors are tested against IELTS's publicly listed average bands. No CEFR estimate or Aptis scale enters this path.

## Next production work

Integration smoke testing with real services; reviewed and licensed question banks; examiner calibration; holistic Speaking assessment; durable background expiration; exam playback policy; idempotent attempt creation; tracing/audit for IELTS authoring and grade revisions; IELTS classes/billing UI and explicit retention policies. Existing base features are not automatically IELTS features simply because they remain in the backend.
