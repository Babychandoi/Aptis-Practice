package vn.weconex.aptis.content.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.repository.RoleRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.auth.service.AuthMailSender;
import vn.weconex.aptis.auth.service.GoogleTokenVerifier;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.content.web.MonthlyFocusDtos;
import vn.weconex.aptis.content.web.MonthlyFocusDtos.Result;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.platform.notification.NotificationSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Đề trọng điểm tháng trên MySQL/Mongo thật: giới hạn làm thử, lộ đáp án, tiến độ, mẹo. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class MonthlyFocusIntegrationTest {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("aptis").withUsername("aptis").withPassword("aptis").withUrlParam("serverTimezone", "UTC");
    @Container static final MongoDBContainer MONGO = new MongoDBContainer("mongo:7");
    @Container static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", MYSQL::getJdbcUrl); r.add("spring.datasource.username", MYSQL::getUsername);
        r.add("spring.datasource.password", MYSQL::getPassword); r.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
        r.add("spring.data.redis.host", REDIS::getHost); r.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }
    @MockBean MinioStorageClient minio;
    @MockBean AuthMailSender mail;
    @MockBean NotificationSender notifications;
    @MockBean GoogleTokenVerifier google;
    @Autowired MonthlyFocusService service;
    @Autowired EntitlementService access;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @Autowired QuestionSetDocumentRepository documents;
    @Autowired PlatformTransactionManager transactionManager;

    private static final String LISTENING_1 = "16000000-0000-4000-8000-000000000021";
    private static final String SINGLE_CHOICE = "12000000-0000-4000-8000-000000000001";
    private final List<String> sets = new ArrayList<>();

    @BeforeEach void seedPage() {
        jdbc.update("DELETE FROM monthly_focus_progress");
        jdbc.update("DELETE FROM monthly_focus_items");
        jdbc.update("DELETE FROM study_part_tips");
        sets.clear();
        // 12 đề Listening 1 trên trang trọng điểm: 10 đầu cho làm thử, 2 sau khoá.
        for (int i = 1; i <= 12; i++) {
            String id = UUID.randomUUID().toString();
            jdbc.update("""
                    INSERT INTO question_sets (id, part_id, task_type_id, code, title, access_level, status,
                                               current_revision, item_count, max_score, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 'PREMIUM', 'PUBLISHED', 2, 1, 2, NOW(), NOW())
                    """, id, LISTENING_1, SINGLE_CHOICE, "MF_TEST_" + id.substring(0, 8), "Câu " + i);
            // Bản revision cũ không được trả ra: chỉ revision hiện hành (2).
            documents.save(document(id, 1, "cũ"));
            documents.save(document(id, 2, "Where does Malik want to go? " + i));
            jdbc.update("""
                    INSERT INTO monthly_focus_items (id, page_key, topic_key, question_set_id, display_order, synced_at)
                    VALUES (?, 'listening-1', '', ?, ?, NOW())
                    """, UUID.randomUUID().toString(), id, i);
            sets.add(id);
        }
        jdbc.update("""
                INSERT INTO study_part_tips (id, page_key, title, description, content, display_order, updated_at)
                VALUES (?, 'listening-1', 'Mẹo làm Listening Câu 1-13', NULL, '["Đọc câu hỏi trước", "Nghe 2 lần"]', 1, NOW())
                """, UUID.randomUUID().toString());
    }

    private static QuestionSetDocument document(String setId, int revision, String prompt) {
        QuestionSetDocument d = new QuestionSetDocument();
        d.setId(UUID.randomUUID().toString());
        d.setQuestionSetId(setId);
        d.setRevision(revision);
        d.setPartId(LISTENING_1);
        d.setTaskTypeCode("SINGLE_CHOICE");
        d.setTitle(prompt);
        d.setSettings(new QuestionSetDocument.Settings());
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("i1");
        item.setSequenceNo(1);
        item.setResponseType("SINGLE_CHOICE");
        QuestionSetDocument.RichContent text = new QuestionSetDocument.RichContent();
        text.setFormat("PLAIN_TEXT");
        text.setValue(prompt);
        item.setPrompt(text);
        List<QuestionSetDocument.Option> options = new ArrayList<>();
        for (String code : List.of("A", "B", "C")) {
            QuestionSetDocument.Option o = new QuestionSetDocument.Option();
            o.setId(code);
            o.setCode(code);
            o.setContent("Phương án " + code);
            options.add(o);
        }
        item.setOptions(options);
        QuestionSetDocument.AnswerKey key = new QuestionSetDocument.AnswerKey();
        key.setType("SINGLE_CHOICE");
        key.setSelectedOptionId("B");
        item.setAnswerKey(key);
        QuestionSetDocument.RichContent explanation = new QuestionSetDocument.RichContent();
        explanation.setFormat("PLAIN_TEXT");
        explanation.setValue("Transcript");
        item.setExplanation(explanation);
        d.setItems(List.of(item));
        return d;
    }

    private User student() {
        return new TransactionTemplate(transactionManager).execute(ignored -> {
            User user = User.register(UUID.randomUUID() + "@test.local", encoder.encode("test-password-123"));
            user.markEmailVerified();
            user.setSignupTrialStatus(User.SignupTrialStatus.BROWSER_USED);
            user.getRoles().add(roles.findByCode(Role.STUDENT).orElseThrow());
            return users.saveAndFlush(user);
        });
    }

    @Test void freeStudentGetsTenUnlockedQuestionsWithAnswersAndTheRestLocked() {
        User free = student();
        MonthlyFocusDtos.PageResponse page = service.page(free.getId(), "listening-1", null);

        assertThat(page.premium()).isFalse();
        assertThat(page.items()).hasSize(12);
        assertThat(page.items()).extracting(MonthlyFocusDtos.ItemResponse::questionSetId).containsExactlyElementsOf(sets);
        assertThat(page.items().subList(0, 10)).allSatisfy(item -> {
            assertThat(item.locked()).isFalse();
            // Trình luyện chấm ngay trên trình duyệt: đáp án và transcript phải có sẵn.
            assertThat(item.content().getItems().get(0).getAnswerKey().getSelectedOptionId()).isEqualTo("B");
            assertThat(item.content().getItems().get(0).getExplanation().getValue()).isEqualTo("Transcript");
            assertThat(item.content().getRevision()).isEqualTo(2);
        });
        assertThat(page.items().subList(10, 12)).allSatisfy(item -> {
            assertThat(item.locked()).isTrue();
            assertThat(item.content()).isNull();
        });
        assertThat(page.tips()).singleElement().satisfies(tip -> {
            assertThat(tip.title()).isEqualTo("Mẹo làm Listening Câu 1-13");
            assertThat(tip.content()).containsExactly("Đọc câu hỏi trước", "Nghe 2 lần");
        });

        // Không xin được URL audio của câu bị khoá.
        assertThatThrownBy(() -> service.assetUrls(free.getId(), "listening-1", sets.get(11)))
                .isInstanceOf(ApiException.class);
        assertThat(service.assetUrls(free.getId(), "listening-1", sets.get(0)).urls()).isEmpty();
    }

    @Test void premiumStudentSeesEveryQuestion() {
        User premium = student();
        access.grant(UserEntitlement.grant(premium.getId(), UserEntitlement.PREMIUM_CONTENT_ACCESS, EntitlementSourceType.ADMIN_GRANT,
                null, Instant.now(), Instant.now().plus(Duration.ofDays(30))));
        MonthlyFocusDtos.PageResponse page = service.page(premium.getId(), "listening-1", null);
        assertThat(page.premium()).isTrue();
        assertThat(page.items()).noneMatch(MonthlyFocusDtos.ItemResponse::locked);
    }

    @Test void progressCountsAttemptsAndKeepsTheLastResult() {
        User user = student();
        String set = sets.get(0);
        service.record(user.getId(), "listening-1", new MonthlyFocusDtos.RecordProgressRequest(set, Result.CORRECT));
        service.record(user.getId(), "listening-1", new MonthlyFocusDtos.RecordProgressRequest(set, Result.CORRECT));
        MonthlyFocusDtos.ProgressEntry last =
                service.record(user.getId(), "listening-1", new MonthlyFocusDtos.RecordProgressRequest(set, Result.WRONG));

        assertThat(last.attempts()).isEqualTo(3);
        assertThat(last.correctAttempts()).isEqualTo(2);
        assertThat(last.lastResult()).isEqualTo(Result.WRONG);
        assertThat(service.progress(user.getId(), "listening-1")).hasSize(1);
        // Tiến độ của người khác không lẫn vào.
        assertThat(service.progress(student().getId(), "listening-1")).isEmpty();

        // Đề không thuộc trang thì không ghi.
        assertThatThrownBy(() -> service.record(user.getId(), "reading-1",
                new MonthlyFocusDtos.RecordProgressRequest(set, Result.CORRECT))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.page(user.getId(), "khong-ton-tai", null)).isInstanceOf(ApiException.class);

        service.clear(user.getId(), "listening-1");
        assertThat(service.progress(user.getId(), "listening-1")).isEmpty();
    }

    @Test void summaryCountsDistinctPublishedSetsPerPage() {
        jdbc.update("UPDATE question_sets SET status = 'ARCHIVED' WHERE id = ?", sets.get(0));
        assertThat(service.summary().counts()).containsEntry("listening-1", 11);
    }

    @Test void writingOverviewUsesTheLatestPredictionUpToToday() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        String writing = jdbc.queryForObject("SELECT id FROM components WHERE code = 'WRITING'", String.class);
        String topic = jdbc.queryForObject("SELECT id FROM topics LIMIT 1", String.class);
        insertPrediction(today.minusDays(1), writing, topic, "Garden", "HOT");
        insertPrediction(today.minusDays(1), writing, topic, "Science", "BACKUP");
        insertPrediction(today.plusDays(3), writing, topic, "Tương lai", "HOT");

        MonthlyFocusDtos.WritingOverviewResponse overview = service.writingOverview();
        assertThat(overview.predictDate()).isEqualTo(today.minusDays(1));
        assertThat(overview.hotTopics()).containsExactly("Garden");
    }

    private void insertPrediction(LocalDate date, String component, String topic, String label, String priority) {
        jdbc.update("""
                INSERT INTO exam_predictions (id, predict_date, topic_id, part_id, component_id, priority, label,
                                              section_label, source, status, display_order, created_at, updated_at)
                VALUES (?, ?, ?, NULL, ?, ?, ?, 'Ưu tiên cao', 'test', 'PUBLISHED', 1, NOW(), NOW())
                """, UUID.randomUUID().toString(), date, topic, component, priority, label);
    }
}
