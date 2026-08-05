package vn.weconex.aptis.content.service;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.domain.QuestionSet;

/**
 * Bộ lọc cho trang quản trị câu hỏi. Khác với bộ lọc học viên: admin thấy được
 * mọi trạng thái, kể cả DRAFT và ARCHIVED.
 */
public final class AdminQuestionSetSpecifications {

    private AdminQuestionSetSpecifications() {
    }

    public static Specification<QuestionSet> forSearch(
            String partId, ContentStatus status, String codeOrTitle) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (partId != null && !partId.isBlank()) {
                predicates.add(cb.equal(root.get("part").get("id"), partId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (codeOrTitle != null && !codeOrTitle.isBlank()) {
                String pattern = "%" + codeOrTitle.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("code")), pattern),
                        cb.like(cb.lower(root.get("title")), pattern)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
