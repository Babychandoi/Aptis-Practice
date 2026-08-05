package vn.weconex.aptis.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.ExamProduct;

public interface ExamProductRepository extends JpaRepository<ExamProduct, String> {

    List<ExamProduct> findByActiveTrue();

    Optional<ExamProduct> findByCode(String code);
}
