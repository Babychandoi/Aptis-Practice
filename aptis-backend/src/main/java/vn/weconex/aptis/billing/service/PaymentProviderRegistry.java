package vn.weconex.aptis.billing.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.exception.ApiException;

/**
 * Tra cổng thanh toán theo mã. Dùng chung cho khởi tạo thanh toán, xử lý webhook
 * và hoàn tiền.
 */
@Slf4j
@Component
public class PaymentProviderRegistry {

    private final Map<String, PaymentProvider> providers;

    public PaymentProviderRegistry(List<PaymentProvider> providerList) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(PaymentProvider::providerCode, Function.identity()));
        log.info("Đã nạp payment provider: {}", providers.keySet());
    }

    public PaymentProvider require(String providerCode) {
        PaymentProvider provider = providers.get(providerCode);
        if (provider == null) {
            throw ApiException.notFound("PaymentProvider", providerCode);
        }
        return provider;
    }

    public java.util.Set<String> availableCodes() {
        return providers.keySet();
    }
}
