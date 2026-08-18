package vn.weconex.aptis;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.repository.RoleRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TaskTypeRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocumentRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chạy Flyway lên MySQL thật rồi để Hibernate validate mọi entity.
 *
 * <p>Test này bắt lệch giữa migration SQL và @Column/@Table — lỗi hay xảy ra
 * nhất khi sửa schema.
 *
 * <p><b>Yêu cầu Docker mà Testcontainers nhận diện được.</b> Docker Desktop
 * 29.x trên Windows đưa ra named pipe của CLI proxy khiến docker-java nhận
 * HTTP 400 khi gọi {@code /info}; khi gặp lỗi
 * "Could not find a valid Docker environment" thì dùng cách thay thế:
 *
 * <pre>
 * docker compose up -d mysql mongo
 * mvn flyway:info flyway:migrate -Pflyway-local
 * </pre>
 *
 * Cách đó chạy đúng 10 migration lên MySQL thật; khởi động app với
 * {@code ddl-auto=validate} sẽ phát hiện lệch schema tương đương test này.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class SchemaConsistencyTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("aptis")
            .withUsername("aptis")
            .withPassword("aptis")
            .withUrlParam("serverTimezone", "UTC");

    @Container
    static final MongoDBContainer MONGO = new MongoDBContainer("mongo:7");

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(
            DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379)
            .waitingFor(Wait.forLogMessage(".*Ready to accept connections.*\\n", 1));

    @Container
    static final GenericContainer<?> MINIO = new GenericContainer<>(
            DockerImageName.parse("minio/minio:latest"))
            .withEnv("MINIO_ROOT_USER", "minioadmin")
            .withEnv("MINIO_ROOT_PASSWORD", "minioadmin")
            .withCommand("server", "/data")
            .withExposedPorts(9000)
            .waitingFor(Wait.forHttp("/minio/health/live").forPort(9000).forStatusCode(200));

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("aptis.scheduler.lock.enabled", () -> "true");
        registry.add("aptis.minio.endpoint", () -> endpoint(MINIO, 9000));
        registry.add("aptis.minio.public-endpoint", () -> endpoint(MINIO, 9000));
    }

    private static String endpoint(GenericContainer<?> container, int port) {
        return "http://" + container.getHost() + ":" + container.getMappedPort(port);
    }

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    TaskTypeRepository taskTypeRepository;

    @Autowired
    PartRepository partRepository;

    @Autowired
    SubscriptionPlanRepository planRepository;

    @Autowired
    StringRedisTemplate redis;

    @Autowired
    MinioStorageClient minio;

    @Autowired
    TestAttemptRepository attemptRepository;

    @Autowired
    AttemptDocumentRepository attemptDocumentRepository;

    @Autowired
    PlatformTransactionManager transactionManager;

    /**
     * Context load được nghĩa là Flyway chạy hết 10 migration và
     * hibernate.ddl-auto=validate không tìm thấy lệch schema.
     */
    @Test
    void contextLoadsWithValidatedSchema() {
        assertThat(roleRepository.count()).isPositive();
    }

    @Test
    void seedsAllRoles() {
        assertThat(roleRepository.findByCode("STUDENT")).isPresent();
        assertThat(roleRepository.findByCode("SUPER_ADMIN")).isPresent();
        assertThat(roleRepository.count()).isEqualTo(8);
    }

    @Test
    void seedsAllTaskTypes() {
        assertThat(taskTypeRepository.count()).isEqualTo(12);
        // Dạng cần AI/giáo viên không có validator
        assertThat(taskTypeRepository.findByCode("LONG_TEXT"))
                .get()
                .satisfies(taskType -> assertThat(taskType.isAutoScorable()).isFalse());
        assertThat(taskTypeRepository.findByCode("SINGLE_CHOICE"))
                .get()
                .satisfies(taskType -> assertThat(taskType.isAutoScorable()).isTrue());
    }

    @Test
    void seedsExamStructure() {
        // 2 Grammar/Vocabulary + 4 Reading + 4 Listening + 4 Speaking + 4 Writing
        assertThat(partRepository.count()).isEqualTo(18);
    }

    @Test
    void seedsPurchasablePlans() {
        var plans = planRepository.findByStatusOrderByDisplayOrder(
                vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan.PlanStatus.ACTIVE);

        assertThat(plans).hasSize(5);
        // Gói trọn đời có duration_days NULL
        assertThat(plans).anySatisfy(plan -> assertThat(plan.isLifetime()).isTrue());
    }

    @Test
    void redisLockBackendAndMinioBucketsAreUsable() {
        redis.opsForValue().set("aptis:test:health", "ok");
        assertThat(redis.opsForValue().get("aptis:test:health")).isEqualTo("ok");

        assertThat(minio.presignedUploadUrl("aptis-content", "health/test.txt"))
                .startsWith(endpoint(MINIO, 9000))
                .contains("X-Amz-Signature=");
    }

    @Test
    void pessimisticAttemptLockPreventsConcurrentMongoAutosaveLostUpdate() {
        User testUser = User.register("schema-concurrency@test.local", "not-used");
        testUser.markEmailVerified();
        String userId = userRepository.saveAndFlush(testUser).getId();
        TestAttempt attempt = new TestAttempt();
        attempt.setPublicCode(TestAttempt.newPublicCode());
        attempt.setUserId(userId);
        attempt.setMode(PracticeMode.CUSTOM_PRACTICE);
        attempt.setAccessLevelUsed(AccessLevel.FREE);
        attempt.setTotalItems(2);
        attempt = attemptRepository.saveAndFlush(attempt);

        AttemptDocument document = new AttemptDocument();
        document.setId(attempt.getId());
        document.setAttemptId(attempt.getId());
        document.setUserId(userId);
        document.setMode(PracticeMode.CUSTOM_PRACTICE.name());
        document.setStatus(attempt.getStatus().name());
        document.setCreatedAt(Instant.now());
        document.setUpdatedAt(Instant.now());
        document.setQuestionSets(List.of(entry("row-1", "set-1"), entry("row-2", "set-2")));
        attemptDocumentRepository.save(document);

        String attemptId = attempt.getId();
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        try {
            CompletableFuture<Void> first = CompletableFuture.runAsync(() ->
                    autosave(transactions, attemptId, "row-1", "item-1", "A"));
            CompletableFuture<Void> second = CompletableFuture.runAsync(() ->
                    autosave(transactions, attemptId, "row-2", "item-2", "B"));
            CompletableFuture.allOf(first, second).join();

            AttemptDocument saved = attemptDocumentRepository.findByAttemptId(attemptId)
                    .orElseThrow();
            assertThat(saved.findEntry("row-1").getResponse().findItemResponse("item-1")
                    .getSelectedOptionId()).isEqualTo("A");
            assertThat(saved.findEntry("row-2").getResponse().findItemResponse("item-2")
                    .getSelectedOptionId()).isEqualTo("B");
        } finally {
            attemptDocumentRepository.deleteById(attemptId);
            attemptRepository.deleteById(attemptId);
        }
    }

    private void autosave(
            TransactionTemplate transactions,
            String attemptId,
            String rowId,
            String itemId,
            String optionId) {
        transactions.executeWithoutResult(status -> {
            attemptRepository.findByIdForUpdate(attemptId).orElseThrow();
            AttemptDocument latest = attemptDocumentRepository.findByAttemptId(attemptId)
                    .orElseThrow();
            AttemptDocument.ItemResponse response = new AttemptDocument.ItemResponse();
            response.setItemId(itemId);
            response.setResponseType("SINGLE_CHOICE");
            response.setSelectedOptionId(optionId);
            response.setAnsweredAt(Instant.now());
            latest.findEntry(rowId).getResponse().upsert(response);
            latest.setUpdatedAt(Instant.now());
            attemptDocumentRepository.save(latest);
        });
    }

    private static AttemptDocument.QuestionSetEntry entry(String rowId, String setId) {
        AttemptDocument.QuestionSetEntry entry = new AttemptDocument.QuestionSetEntry();
        entry.setAttemptQuestionSetId(rowId);
        entry.setQuestionSetId(setId);
        return entry;
    }
}
