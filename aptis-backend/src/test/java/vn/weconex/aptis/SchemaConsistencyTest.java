package vn.weconex.aptis;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.weconex.aptis.auth.repository.RoleRepository;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TaskTypeRepository;

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

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
        // Không cần Redis/SMTP cho test này
        registry.add("spring.autoconfigure.exclude",
                () -> "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration");
    }

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    TaskTypeRepository taskTypeRepository;

    @Autowired
    PartRepository partRepository;

    @Autowired
    SubscriptionPlanRepository planRepository;

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
}
