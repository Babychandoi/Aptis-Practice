package vn.weconex.aptis.billing.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateAccount;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateSettings;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.repository.AffiliateAccountRepository;
import vn.weconex.aptis.billing.repository.AffiliateCommissionRepository;
import vn.weconex.aptis.billing.repository.AffiliatePayoutRepository;
import vn.weconex.aptis.billing.repository.AffiliateReferralRepository;
import vn.weconex.aptis.billing.repository.AffiliateSettingsRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;

/**
 * Không ai tự giới thiệu chính mình.
 *
 * <p>Đây là cách lạm dụng rõ ràng nhất: tự nhập mã của mình để vừa được giảm
 * giá vừa ăn hoa hồng của chính đơn đó. Chặn ở hai tầng — lúc áp mã và lúc chốt
 * hoa hồng — nên test cả hai.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AffiliateSelfReferralTest {

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

    private final String userId = UUID.randomUUID().toString();

    @BeforeEach
    void setUp() {
        AffiliateSettings config = new AffiliateSettings();
        when(settingsRepository.findById((byte) 1)).thenReturn(Optional.of(config));
    }

    @Test
    @DisplayName("Nhập mã của chính mình lúc đặt đơn thì bị từ chối")
    void cannotApplyOwnCode() {
        AffiliateAccount own = new AffiliateAccount();
        own.setId(UUID.randomUUID().toString());
        own.setUserId(userId);
        own.setCode("SELF2345");
        when(accountRepository.findByCode("SELF2345")).thenReturn(Optional.of(own));

        assertThatThrownBy(() -> service.apply(userId, "SELF2345", 500_000L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("chính mình");
    }

    @Test
    @DisplayName("Mã của người khác thì vẫn áp được bình thường")
    void othersCodeStillWorks() {
        AffiliateAccount other = new AffiliateAccount();
        other.setId(UUID.randomUUID().toString());
        other.setUserId(UUID.randomUUID().toString());
        other.setCode("FRND2345");
        when(accountRepository.findByCode("FRND2345")).thenReturn(Optional.of(other));
        when(referralRepository.findByReferredUserId(userId)).thenReturn(Optional.empty());

        AffiliateService.AppliedReferral applied = service.apply(userId, "FRND2345", 500_000L);

        assertThat(applied.isApplied()).isTrue();
        // Mặc định giảm 5%.
        assertThat(applied.discountAmount()).isEqualTo(25_000L);
    }

    @Test
    @DisplayName("Đơn tự giới thiệu lọt qua được thì vẫn không sinh hoa hồng")
    void noCommissionForSelfReferral() {
        Order order = new Order();
        order.setId(UUID.randomUUID().toString());
        order.setOrderCode("AP12345678");
        order.setUserId(userId);
        // Dữ liệu cũ hoặc lỗi ở tầng trên có thể để lọt đơn kiểu này.
        order.setAffiliateUserId(userId);
        order.setSubtotalAmount(500_000L);
        order.setTotalAmount(475_000L);

        when(commissionRepository.findByOrderId(order.getId())).thenReturn(Optional.empty());

        service.onOrderPaid(order);

        verify(commissionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đơn của người khác giới thiệu thì vẫn sinh hoa hồng")
    void commissionForRealReferral() {
        String affiliateUserId = UUID.randomUUID().toString();
        Order order = new Order();
        order.setId(UUID.randomUUID().toString());
        order.setOrderCode("AP87654321");
        order.setUserId(userId);
        order.setAffiliateUserId(affiliateUserId);
        order.setSubtotalAmount(500_000L);
        order.setTotalAmount(475_000L);

        AffiliateAccount account = new AffiliateAccount();
        account.setId(UUID.randomUUID().toString());
        account.setUserId(affiliateUserId);
        account.setCode("FRND2345");

        when(commissionRepository.findByOrderId(order.getId())).thenReturn(Optional.empty());
        when(accountRepository.findByUserIdForUpdate(affiliateUserId))
                .thenReturn(Optional.of(account));

        service.onOrderPaid(order);

        verify(commissionRepository).save(any());
        // 10% trên giá gốc 500k.
        assertThat(account.getTotalEarned()).isEqualTo(50_000L);
    }
}
