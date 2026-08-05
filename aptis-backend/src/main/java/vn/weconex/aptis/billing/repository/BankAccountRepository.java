package vn.weconex.aptis.billing.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.BankAccount;

public interface BankAccountRepository extends JpaRepository<BankAccount, String> {

    List<BankAccount> findByActiveTrueOrderByDisplayOrderAsc();

    List<BankAccount> findAllByOrderByDisplayOrderAsc();

    /** Tài khoản mặc định nhận tiền — cái đang bật có thứ tự nhỏ nhất. */
    Optional<BankAccount> findFirstByActiveTrueOrderByDisplayOrderAsc();
}
