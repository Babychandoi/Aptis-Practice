package vn.weconex.aptis.practice.service;

import java.util.List;

import org.junit.jupiter.api.Test;
import vn.weconex.aptis.practice.mongo.AttemptDocument;

import static org.assertj.core.api.Assertions.assertThat;

class EvaluationQueueTest {

    @Test
    void unansweredManualItemsDoNotLeaveAttemptWaitingForANonexistentJob() {
        AttemptDocument.QuestionSetEntry entry = entryWith(response(null, null));

        assertThat(EvaluationQueue.hasSubmittedContent(entry)).isFalse();

        entry = entryWith(response("   ", null));
        assertThat(EvaluationQueue.hasSubmittedContent(entry)).isFalse();
    }

    @Test
    void textOrRecordingCreatesManualEvaluationWork() {
        assertThat(EvaluationQueue.hasSubmittedContent(entryWith(response("An answer", null))))
                .isTrue();
        assertThat(EvaluationQueue.hasSubmittedContent(entryWith(response(null, "asset-1"))))
                .isTrue();
    }

    private static AttemptDocument.QuestionSetEntry entryWith(
            AttemptDocument.ItemResponse itemResponse) {
        AttemptDocument.QuestionSetEntry entry = new AttemptDocument.QuestionSetEntry();
        AttemptDocument.Response response = new AttemptDocument.Response();
        response.setItemResponses(List.of(itemResponse));
        entry.setResponse(response);
        return entry;
    }

    private static AttemptDocument.ItemResponse response(String text, String recordingAssetId) {
        AttemptDocument.ItemResponse response = new AttemptDocument.ItemResponse();
        response.setTextValue(text);
        response.setRecordingAssetId(recordingAssetId);
        return response;
    }
}
