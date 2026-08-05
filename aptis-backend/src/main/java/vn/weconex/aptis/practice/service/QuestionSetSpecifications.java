package vn.weconex.aptis.practice.service;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.practice.web.PracticeDtos;

/**
 * Specification cho luyện tùy chọn (PHẦN IV §37).
 */
public final class QuestionSetSpecifications {

    private QuestionSetSpecifications() {
    }

    public static Specification<QuestionSet> forCustomPractice(
            PracticeDtos.CreateCustomAttemptRequest request, boolean hasPremium) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("status"), ContentStatus.PUBLISHED));

            // Không có Premium thì chỉ thấy nội dung FREE — chặn tại DB,
            // không dựa vào lọc phía client
            if (!hasPremium) {
                predicates.add(cb.equal(root.get("accessLevel"), AccessLevel.FREE));
            }

            if (isNotEmpty(request.partIds())) {
                predicates.add(root.get("part").get("id").in(request.partIds()));
            } else if (isNotEmpty(request.componentIds())) {
                predicates.add(root.get("part").get("component").get("id").in(request.componentIds()));
            }

            if (isNotEmpty(request.topicIds())) {
                predicates.add(root.get("topic").get("id").in(request.topicIds()));
            }

            if (request.difficultyMin() != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("difficulty"), request.difficultyMin().byteValue()));
            }
            if (request.difficultyMax() != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("difficulty"), request.difficultyMax().byteValue()));
            }

            // CEFR: giữ bộ có khoảng giao với khoảng học viên chọn
            if (request.cefrMin() != null) {
                predicates.add(cb.or(
                        cb.isNull(root.get("cefrMax")),
                        cb.greaterThanOrEqualTo(root.get("cefrMax"), request.cefrMin())));
            }
            if (request.cefrMax() != null) {
                predicates.add(cb.or(
                        cb.isNull(root.get("cefrMin")),
                        cb.lessThanOrEqualTo(root.get("cefrMin"), request.cefrMax())));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static boolean isNotEmpty(List<String> values) {
        return values != null && !values.isEmpty();
    }
}
