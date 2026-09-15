package vn.weconex.aptis.billing.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateAccount;
import vn.weconex.aptis.billing.repository.AffiliateAccountRepository;
import vn.weconex.aptis.billing.repository.AffiliateCommissionRepository;
import vn.weconex.aptis.billing.repository.AffiliatePayoutRepository;
import vn.weconex.aptis.billing.repository.AffiliateReferralRepository;
import vn.weconex.aptis.billing.repository.AffiliateSettingsRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;

/**
 * Cấp mã giới thiệu không được tạo mã thứ hai cho người đã có.
 *
 * <p>Quan trọng vì mã được gọi cấp từ nhiều đường: lúc admin xác nhận chuyển
 * khoản, lúc admin tặng Premium tay, job định kỳ, và lúc người dùng mở trang.
 * Nếu mỗi đường tạo một mã thì người đã chia sẻ mã cũ cho bạn bè sẽ mất hoa
 * hồng.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AffiliateGrantAccountTest {

    @Mock
    private AffiliateSettingsRepository settingsRepository;
    @Mock
    private AffiliateAccountRepository accountRepository;
    @Mock
    private AffiliateReferralRepository referralRepository;
    @Mock
    private AffiliateCommissionRepository commissionRepository;
    @Mock
    private AffiliatePayoutRepository payoutRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private UserEntitlementRepository entitlementRepository;

    @InjectMocks
    private AffiliateService service;

    @Test
    @DisplayName("Người đã có mã thì giữ nguyên mã cũ, không tạo mã mới")
    void keepsExistingCode() {
        String userId = UUID.randomUUID().toString();
        AffiliateAccount existing = new AffiliateAccount();
        existing.setId(UUID.randomUUID().toString());
        existing.setUserId(userId);
        existing.setCode("ABCD2345");

        when(accountRepository.findByUserId(userId)).thenReturn(Optional.of(existing));

        AffiliateAccount result = service.grantAccount(userId);

        assertThat(result.getCode()).isEqualTo("ABCD2345");
        verify(accountRepository, never()).save(any());
    }

    @Test
    @DisplayName("Người chưa có mã thì được cấp mã mới")
    void createsCodeWhenMissing() {
        String userId = UUID.randomUUID().toString();
        when(accountRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(accountRepository.existsByCode(any())).thenReturn(false);
        when(accountRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        AffiliateAccount result = service.grantAccount(userId);

        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getCode()).hasSize(8);
        // Bộ ký tự bỏ 0/O/1/I/L để đọc qua điện thoại không nhầm.
        assertThat(result.getCode()).matches("[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}");
        verify(accountRepository).save(any());
    }

    @Test
    @DisplayName("Gọi cấp nhiều lần vẫn chỉ một mã — đối soát bấm hai lần không sinh mã thứ hai")
    void repeatedGrantsAreIdempotent() {
        String userId = UUID.randomUUID().toString();
        AffiliateAccount created = new AffiliateAccount();
        created.setId(UUID.randomUUID().toString());
        created.setUserId(userId);
        created.setCode("XYZW6789");

        // Lần đầu chưa có, các lần sau đã có.
        when(accountRepository.findByUserId(userId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(created));
        when(accountRepository.existsByCode(any())).thenReturn(false);
        when(accountRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        String first = service.grantAccount(userId).getCode();
        String second = service.grantAccount(userId).getCode();
        String third = service.grantAccount(userId).getCode();

        assertThat(second).isEqualTo("XYZW6789");
        assertThat(third).isEqualTo("XYZW6789");
        assertThat(first).isNotBlank();
        // Chỉ ghi đúng một lần dù gọi ba lần.
        verify(accountRepository).save(any());
    }
}
