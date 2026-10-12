# Validation and local smoke test

## Automated checks

Observed results: 19 IELTS backend cases passed; 3 frontend workflow cases passed. The regression suite reported 256 cases, 248 passed and 8 Docker-dependent cases skipped, with zero failures/errors. The final IELTS changes were rechecked with the targeted suite; production frontend build also passed.

- IELTS backend: scoring and service unit tests cover answer redaction, ownership, role boundaries, file membership, server-side Premium, expired saves, stale versions, idempotent submission, full-test composition, short-practice bands, Task 2 weighting, Overall rounding and all four shipped sample exams in draft and published forms.
- Backend regression suite: run with the original Aptis tests, including the compatible default email branding. Docker-dependent schema checks are skipped when Docker is absent.
- IELTS frontend: React workflow tests cover student navigation, absence of answer keys, queued autosave with edits made during an in-flight save, submit waiting for the latest persisted response, and preserving drafts after a save error.
- TypeScript/Vite production build succeeds.
- Compose YAML, database/volume separation and example JSON were checked locally.
- Exporter is exercised against a new directory; copied source structure, Compose paths, excluded runtime folders and example files are verified.

This environment has no Docker daemon. No claim is made that Docker images, Flyway startup, real MongoDB persistence, MinIO/CORS uploads, refresh-cookie delivery, microphone capture or visual browser layouts passed end-to-end verification here. These require the following smoke test on the intended host.

The execution JDK cannot attach Mockito's Byte Buddy agent dynamically. Backend tests were run with an explicit `-javaagent` for the already-resolved `byte-buddy-agent` JAR. This is a test environment workaround, not a change to production code.

## Required smoke test on a machine with Docker

1. Start `docker compose -f docker-compose.ielts.yml up -d --build`; verify backend/frontend are running and readiness is healthy. In the standalone export use `docker compose up -d --build`.
2. Open http://localhost:8180, register a learner and `teacher@ielts.local`. Follow the verification email from http://localhost:8035. Confirm normal login, logout, reload/session restore and password reset.
3. Run the targeted bootstrap SQL on the IELTS database, then sign in again as the teacher. Confirm learner accounts do not see teacher navigation and receive 403 for author/review endpoints.
4. Download and import the four sample JSON files, check their content and publish them. Confirm invalid full-length Reading with fewer than 40 questions cannot publish but can remain a draft.
5. As a learner, complete the General Training reading exercise. Navigate away and back after saves; reload the page. Verify only the owner can read the attempt, version conflicts are visible, and answers remain hidden until submission.
6. Complete both Writing tasks. Verify the result waits for review and no band or Overall is fabricated. Grade both tasks in the teacher screen; inspect rubric feedback and Task 2 weighting.
7. Grant microphone permission for Speaking. Record, preview, upload, save, submit and review the recording. Test file upload fallback in a browser without MediaRecorder. Check signed media URLs renew after expiration.
8. Upload a real Listening audio file and an image for a Reading map/Writing chart. Publish a short exercise, play/view the asset as learner, and verify a different learner cannot obtain a recording URL or attach someone else's recording to their own attempt.
9. Test all 4 skills in one teacher-created full composition. Verify per-skill deadline, locking and next-skill order; after all four grades are available, check Overall against hand calculation.
10. Test two teachers, two students, two browser tabs, a lost network during autosave, server downtime during submission, expiry with unsaved changes and reopening an expired attempt. Check desktop/mobile widths and keyboard focus in a real browser.

These manual steps are verification work, not completed results.
