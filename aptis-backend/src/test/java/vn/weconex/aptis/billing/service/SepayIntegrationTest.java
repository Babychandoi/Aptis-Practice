package vn.weconex.aptis.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.auth.service.AuthMailSender;
import vn.weconex.aptis.auth.service.GoogleTokenVerifier;
import vn.weconex.aptis.billing.domain.BankAccount;
import vn.weconex.aptis.billing.domain.BankTransferRequest;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.repository.*;
import vn.weconex.aptis.billing.web.BillingDtos;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.platform.notification.NotificationSender;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties={"aptis.scheduler.lock.enabled=true"})
@AutoConfigureMockMvc
class SepayIntegrationTest {
    @Container static MySQLContainer<?> MYSQL=new MySQLContainer<>("mysql:8.4").withDatabaseName("aptis").withUsername("aptis").withPassword("aptis").withUrlParam("serverTimezone","UTC");
    @Container static MongoDBContainer MONGO=new MongoDBContainer("mongo:7");
    @Container static GenericContainer<?> REDIS=new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",MYSQL::getJdbcUrl);r.add("spring.datasource.username",MYSQL::getUsername);r.add("spring.datasource.password",MYSQL::getPassword);
        r.add("spring.data.mongodb.uri",MONGO::getReplicaSetUrl);r.add("spring.data.redis.host",REDIS::getHost);r.add("spring.data.redis.port",()->REDIS.getMappedPort(6379));
    }
    @MockBean MinioStorageClient minio;
    @MockBean AuthMailSender mail;
    @MockBean NotificationSender notifications;
    @MockBean GoogleTokenVerifier google;
    @MockBean SepayGatewayClient gatewayClient;
    @Autowired SepayGatewayService gateway;
    @Autowired SepaySettingsService settings;
    @Autowired SepayWebhookService webhook;
    @Autowired BankTransferService transfers;
    @Autowired BankTransferRequestRepository transferRepo;
    @Autowired BankAccountRepository banks;
    @Autowired OrderService orderService;
    @Autowired OrderRepository orders;
    @Autowired UserRepository users;
    @Autowired EntitlementService access;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired PlatformTransactionManager tx;
    private static final String SECRET="test-only-sepay-key-123456789012345678901234";
    private static final AtomicLong IDS=new AtomicLong(50000);
    record Fixture(User user,Order order,BankTransferRequest transfer) {}
    private Fixture fixture(boolean ai) {
        BankAccount bank=banks.findAll().stream().filter(b->"1234567890".equals(b.getAccountNumber())).findFirst().orElseGet(()->{
            BankAccount b=new BankAccount();b.setBankCode("MB");b.setBankName("MB Bank");b.setAccountHolder("Test only");b.setAccountNumber("1234567890");b.setActive(true);return banks.saveAndFlush(b);
        });
        settings.update(null,true,bank.getId(),"HMAC",SECRET);
        User u=User.register(UUID.randomUUID()+"@test.local","unused-hash");u.markEmailVerified();u.setSignupTrialStatus(User.SignupTrialStatus.BROWSER_USED);u=users.saveAndFlush(u);
        String plan=jdbc.queryForObject("SELECT id FROM subscription_plans WHERE status='ACTIVE' AND " + (ai?"code LIKE 'AI_LOUNGE_%'":"code NOT LIKE 'AI_LOUNGE_%'")+" ORDER BY price_amount LIMIT 1",String.class);
        Order order=orderService.createOrder(u.getId(),UUID.randomUUID().toString(),new BillingDtos.CreateOrderRequest(plan,null,null));
        return new Fixture(u,order,transfers.requestTransfer(u.getId(),order.getId()));
    }
    private byte[] payload(Fixture f,long id,long amount,String content,String account,String direction,String reference,Instant when) throws Exception {
        return json.writeValueAsBytes(Map.of("id",id,"gateway","MBBank","accountNumber",account,"transferType",direction,"transferAmount",amount,"content",content,"referenceCode",reference,
                "transactionDate",DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(when)));
    }
    private byte[] valid(Fixture f,long id) throws Exception { return payload(f,id,f.order.getTotalAmount(),f.transfer.getTransferCode(),"1234567890","in","FT"+id,Instant.now()); }
    private void receive(byte[] raw) throws Exception { webhook.receive(raw,SepayWebhookAuthTest.sign(raw,SECRET,Instant.now().getEpochSecond())); }
    private String receiptStatus(long id) {return jdbc.queryForObject("SELECT status FROM sepay_transactions WHERE event_id=?",String.class,id);}
    @Test void premiumAndAiVoiceAreActivatedSeparatelyAndRetryDoesNotExtendAgain() throws Exception {
        for(boolean ai:new boolean[]{false,true}) {
            Fixture f=fixture(ai);long id=IDS.incrementAndGet();byte[] raw=valid(f,id);receive(raw);
            assertThat(orders.findById(f.order.getId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PAID);
            assertThat(access.hasPremiumAccess(f.user.getId())).isEqualTo(!ai);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_entitlements WHERE user_id=? AND entitlement_code='AI_CONVERSATION_ACCESS'",Integer.class,f.user.getId())).isEqualTo(ai?1:0);
            String deadline=jdbc.queryForObject("SELECT CAST(ends_at AS CHAR) FROM user_subscriptions WHERE source_order_id=?",String.class,f.order.getId());
            receive(raw);
            assertThat(jdbc.queryForObject("SELECT CAST(ends_at AS CHAR) FROM user_subscriptions WHERE source_order_id=?",String.class,f.order.getId())).isEqualTo(deadline);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payment_transactions WHERE order_id=?",Integer.class,f.order.getId())).isEqualTo(1);
            assertThat(receiptStatus(id)).isEqualTo("APPLIED");
        }
    }
    @Test void twoConcurrentDeliveriesCreateOnlyOnePayment() throws Exception {
        Fixture f=fixture(false);long id=IDS.incrementAndGet();byte[] raw=valid(f,id);var headers=SepayWebhookAuthTest.sign(raw,SECRET,Instant.now().getEpochSecond());
        CountDownLatch start=new CountDownLatch(1);
        Runnable call=()->{try{start.await();webhook.receive(raw,headers);}catch(Exception ex){throw new RuntimeException(ex);}};
        var a=CompletableFuture.runAsync(call);var b=CompletableFuture.runAsync(call);start.countDown();CompletableFuture.allOf(a,b).get();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payment_transactions WHERE order_id=?",Integer.class,f.order.getId())).isEqualTo(1);
    }
    @Test void wrongAmountWrongBankUnknownCodeAndOutgoingNeverGrant() throws Exception {
        Fixture f=fixture(false);
        long amountId=IDS.incrementAndGet();receive(payload(f,amountId,f.order.getTotalAmount()-1,f.transfer.getTransferCode(),"1234567890","in","FT"+amountId,Instant.now()));assertThat(receiptStatus(amountId)).isEqualTo("REVIEW");
        long bankId=IDS.incrementAndGet();receive(payload(f,bankId,f.order.getTotalAmount(),f.transfer.getTransferCode(),"other-account","in","FT"+bankId,Instant.now()));assertThat(receiptStatus(bankId)).isEqualTo("REVIEW");
        long unknown=IDS.incrementAndGet();receive(payload(f,unknown,f.order.getTotalAmount(),"AP99999999","1234567890","in","FT"+unknown,Instant.now()));assertThat(receiptStatus(unknown)).isEqualTo("REVIEW");
        long out=IDS.incrementAndGet();receive(payload(f,out,f.order.getTotalAmount(),f.transfer.getTransferCode(),"1234567890","out","FT"+out,Instant.now()));assertThat(receiptStatus(out)).isEqualTo("IGNORED");
        assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isFalse();assertThat(access.hasPremiumAccess(f.user.getId())).isFalse();
    }
    @Test void validPaymentUsingOldQrCodeCanArriveAfterQrRefresh() throws Exception {
        Fixture f=fixture(false);String old=f.transfer.getTransferCode();
        jdbc.update("UPDATE bank_transfer_requests SET qr_expires_at=UTC_TIMESTAMP()-INTERVAL 1 MINUTE WHERE id=?",f.transfer.getId());
        var refreshed=transfers.refreshQr(f.user.getId(),f.order.getId());assertThat(refreshed.getTransferCode()).isNotEqualTo(old);
        long id=IDS.incrementAndGet();receive(payload(f,id,f.order.getTotalAmount(),old,"1234567890","in","FT"+id,Instant.now()));
        assertThat(receiptStatus(id)).isEqualTo("APPLIED");assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isTrue();
    }
    @Test void sameBankReferenceCannotBeReusedToPayAnotherOrder() throws Exception {
        Fixture first=fixture(false),second=fixture(true);long id=IDS.incrementAndGet();receive(valid(first,id));
        long secondId=IDS.incrementAndGet();receive(payload(second,secondId,second.order.getTotalAmount(),second.transfer.getTransferCode(),"1234567890","in","FT"+id,Instant.now()));
        assertThat(orders.findById(second.order.getId()).orElseThrow().isPaid()).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sepay_transactions WHERE event_id=?",Integer.class,secondId)).isZero();
        byte[] changed=valid(second,id);
        assertThatThrownBy(()->receive(changed)).hasMessageContaining("nội dung đã thay đổi");
    }
    @Test void lateWebhookWithBankTimestampBeforeExpiryCanRecoverExpiredOrder() throws Exception {
        Fixture f=fixture(false);Instant paidAt=Instant.now();
        new TransactionTemplate(tx).executeWithoutResult(ignored->{Order o=orders.findByIdForUpdate(f.order.getId()).orElseThrow();o.setExpiresAt(paidAt.plusSeconds(1));o.setStatus(OrderStatus.EXPIRED);});
        long id=IDS.incrementAndGet();receive(payload(f,id,f.order.getTotalAmount(),f.transfer.getTransferCode(),"1234567890","in","FT"+id,paidAt));
        assertThat(receiptStatus(id)).isEqualTo("APPLIED");
    }
    @Test void paymentAfterExpiryAndSandboxEventsRequireNoActivation() throws Exception {
        Fixture f=fixture(false);jdbc.update("UPDATE orders SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 MINUTE WHERE id=?",f.order.getId());
        long late=IDS.incrementAndGet();receive(valid(f,late));assertThat(receiptStatus(late)).isEqualTo("REVIEW");
        long sandbox=IDS.incrementAndGet();receive(payload(f,sandbox,f.order.getTotalAmount(),f.transfer.getTransferCode(),"1234567890","in","SB"+sandbox,Instant.now()));assertThat(receiptStatus(sandbox)).isEqualTo("IGNORED");
        assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isFalse();
    }
    @Test void activationFailureRollsBackReceiptAndPaymentThenRetrySucceeds() throws Exception {
        Fixture f=fixture(false);long id=IDS.incrementAndGet();byte[] raw=valid(f,id);
        String itemId=jdbc.queryForObject("SELECT id FROM order_items WHERE order_id=?",String.class,f.order.getId());
        jdbc.update("UPDATE order_items SET item_type='SUBSCRIPTION_PLAN',item_id=? WHERE id=?",UUID.randomUUID().toString(),itemId);
        assertThatThrownBy(()->receive(raw)).isInstanceOf(Exception.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sepay_transactions WHERE event_id=?",Integer.class,id)).isZero();
        assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isFalse();
        String plan=jdbc.queryForObject("SELECT id FROM subscription_plans WHERE status='ACTIVE' AND code NOT LIKE 'AI_LOUNGE_%' ORDER BY price_amount LIMIT 1",String.class);
        jdbc.update("UPDATE order_items SET item_id=? WHERE id=?",plan,itemId);receive(raw);assertThat(receiptStatus(id)).isEqualTo("APPLIED");
    }
    @Test void httpAuthSampleAcknowledgementAndAdminPermissions() throws Exception {
        fixture(false);byte[] raw="{\"id\":0}".getBytes(java.nio.charset.StandardCharsets.UTF_8);var headers=SepayWebhookAuthTest.sign(raw,SECRET,Instant.now().getEpochSecond());
        mvc.perform(post("/api/v1/payments/webhooks/sepay").contentType("application/json").content(raw)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/payments/webhooks/sepay").contentType("application/json").content(raw)
                .header("X-SePay-Timestamp",headers.get("x-sepay-timestamp")).header("X-SePay-Signature",headers.get("x-sepay-signature")))
                .andExpect(status().isOk()).andExpect(jsonPath("success").value(true));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sepay_transactions WHERE event_id=0",Integer.class)).isZero();
        mvc.perform(get("/api/v1/admin/sepay/settings")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/sepay/settings").with(user("student").roles("STUDENT"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/sepay/settings").with(user("admin").authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"),new org.springframework.security.core.authority.SimpleGrantedAuthority("plan:write"))))
                .andExpect(status().isOk()).andExpect(jsonPath("secretConfigured").value(true)).andExpect(jsonPath("secretCiphertext").doesNotExist());
        assertThat(jdbc.queryForObject("SELECT secret_ciphertext FROM sepay_settings WHERE id=1",String.class)).doesNotContain(SECRET);
    }
    @Test void retiredSepaySandboxEndpointsAreBlockedEvenForAdmins() throws Exception {
        for(String path:java.util.List.of("/api/v1/admin/sepay/sandbox","/api/v1/admin/sepay/sandbox/orders")) {
            mvc.perform(get(path).with(user("admin").roles("ADMIN"))).andExpect(status().isForbidden());
        }
        mvc.perform(post("/api/v1/payments/sepay/ipn/sandbox").contentType("application/json").content("{}").header("X-Secret-Key",SECRET))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/payments/sepay/ipn/sandbox").with(user("admin").roles("ADMIN")).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }
    record GatewayFixture(User user,Order order,SepayGatewayService.Checkout checkout) {}
    private GatewayFixture gatewayFixture(boolean ai) {
        when(gatewayClient.enabled()).thenReturn(true);when(gatewayClient.configured()).thenReturn(true);
        when(gatewayClient.merchant()).thenReturn("SP-LIVE-FIXTURE");when(gatewayClient.environment()).thenReturn("production");
        when(gatewayClient.secret()).thenReturn("spsk_live_test_fixture_not_a_real_key");
        when(gatewayClient.merchantFingerprint()).thenReturn(SepayGatewayClient.hash("SP-LIVE-FIXTURE"));
        var real=new SepayGatewayClient(json,true,"production","SP-LIVE-FIXTURE","spsk_live_test_fixture_not_a_real_key",SECRET);
        doAnswer(invocation->{real.authenticate(invocation.getArgument(0));return null;}).when(gatewayClient).authenticate(nullable(String.class));
        User u=User.register(UUID.randomUUID()+"@test.local","unused-hash");u.markEmailVerified();u.setSignupTrialStatus(User.SignupTrialStatus.BROWSER_USED);u=users.saveAndFlush(u);
        String plan=jdbc.queryForObject("SELECT id FROM subscription_plans WHERE status='ACTIVE' AND "+(ai?"code LIKE 'AI_LOUNGE_%'":"code NOT LIKE 'AI_LOUNGE_%'")+" ORDER BY price_amount LIMIT 1",String.class);
        Order order=orderService.createOrder(u.getId(),UUID.randomUUID().toString(),new BillingDtos.CreateOrderRequest(plan,null,null));
        return new GatewayFixture(u,order,gateway.create(u.getId(),order.getId()));
    }
    private byte[] gatewayPayload(GatewayFixture f,String txId,long amount,Instant paidAt) throws Exception {
        return json.writeValueAsBytes(Map.of("notification_type","ORDER_PAID","timestamp",Instant.now().getEpochSecond(),
                "order",gatewayRemote(f,amount,"CAPTURED"),"transaction",Map.of("transaction_id",txId,"transaction_status","APPROVED",
                        "transaction_type","PAYMENT","payment_method","BANK_TRANSFER","transaction_amount",String.valueOf(amount),"transaction_currency","VND",
                        "transaction_date",DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(paidAt))));
    }
    private com.fasterxml.jackson.databind.JsonNode gatewayRemote(GatewayFixture f,long amount,String state) {
        return json.valueToTree(Map.of("order_id","pg-"+f.order.getId(),"order_invoice_number",f.checkout.invoice(),"order_amount",String.valueOf(amount),"order_currency","VND","order_status",state));
    }
    private void attest(GatewayFixture f) {when(gatewayClient.retrieve(f.checkout.invoice())).thenReturn(gatewayRemote(f,f.order.getTotalAmount(),"CAPTURED"));}
    @Test void liveGatewayActivatesCorrectProductAndStableCheckoutRetry() throws Exception {
        for(boolean ai:new boolean[]{false,true}) {
            GatewayFixture f=gatewayFixture(ai);attest(f);
            assertThat(gateway.method(f.user.getId(),f.order.getId()).mode()).isEqualTo("SEPAY_GATEWAY");
            assertThat(gateway.create(f.user.getId(),f.order.getId()).invoice()).isEqualTo(f.checkout.invoice());
            assertThat(f.checkout.checkoutUrl()).isEqualTo("https://pay.sepay.vn/v1/checkout/init");
            assertThat(f.checkout.fields().get("success_url")).startsWith("https://aptispractices.io.vn/checkout/");
            assertThat(f.checkout.fields().values()).doesNotContain(SECRET,"spsk_live_test_fixture_not_a_real_key");
            byte[] payload=gatewayPayload(f,"tx"+IDS.incrementAndGet(),f.order.getTotalAmount(),Instant.now());
            gateway.receive(payload,SECRET);
            String deadline=jdbc.queryForObject("SELECT CAST(ends_at AS CHAR) FROM user_subscriptions WHERE source_order_id=?",String.class,f.order.getId());
            gateway.receive(payload,SECRET);
            assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isTrue();
            assertThat(access.hasPremiumAccess(f.user.getId())).isEqualTo(!ai);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_entitlements WHERE user_id=? AND entitlement_code='AI_CONVERSATION_ACCESS'",Integer.class,f.user.getId())).isEqualTo(ai?1:0);
            assertThat(jdbc.queryForObject("SELECT CAST(ends_at AS CHAR) FROM user_subscriptions WHERE source_order_id=?",String.class,f.order.getId())).isEqualTo(deadline);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payment_transactions WHERE order_id=? AND status='SUCCESS'",Integer.class,f.order.getId())).isEqualTo(1);
        }
    }
    @Test void liveGatewayConcurrentCallbacksActivateOnce() throws Exception {
        GatewayFixture f=gatewayFixture(false);attest(f);
        byte[] body=gatewayPayload(f,"tx"+IDS.incrementAndGet(),f.order.getTotalAmount(),Instant.now());
        CountDownLatch start=new CountDownLatch(1);
        Runnable call=()->{try {start.await();gateway.receive(body,SECRET);}catch(Exception ex){throw new RuntimeException(ex);}};
        var a=CompletableFuture.runAsync(call);var b=CompletableFuture.runAsync(call);start.countDown();CompletableFuture.allOf(a,b).get();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_subscriptions WHERE source_order_id=?",Integer.class,f.order.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payment_transactions WHERE order_id=?",Integer.class,f.order.getId())).isEqualTo(1);
    }
    @Test void liveGatewayAuthOwnerAndLegacyQrGuards() throws Exception {
        GatewayFixture f=gatewayFixture(false);byte[] body=gatewayPayload(f,"tx"+IDS.incrementAndGet(),f.order.getTotalAmount(),Instant.now());
        mvc.perform(post(SepayGatewayClient.IPN_PATH).contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post(SepayGatewayClient.IPN_PATH).contentType("application/json").content(body).header("X-Secret-Key","wrong-key")).andExpect(status().isUnauthorized());
        assertThatThrownBy(()->gateway.create(UUID.randomUUID().toString(),f.order.getId())).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        assertThatThrownBy(()->gateway.method(UUID.randomUUID().toString(),f.order.getId())).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        Fixture legacy=fixture(false);
        assertThat(gateway.method(legacy.user.getId(),legacy.order.getId()).mode()).isEqualTo("BANK_TRANSFER");
        assertThatThrownBy(()->gateway.create(legacy.user.getId(),legacy.order.getId())).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        verify(gatewayClient,never()).retrieve(anyString());
    }
    @Test void liveGatewayRejectsWrongAmountApiStatusAndSandboxInvoice() throws Exception {
        GatewayFixture f=gatewayFixture(false);
        byte[] body=gatewayPayload(f,"tx"+IDS.incrementAndGet(),f.order.getTotalAmount()+1,Instant.now());
        when(gatewayClient.retrieve(f.checkout.invoice())).thenReturn(gatewayRemote(f,f.order.getTotalAmount()+1,"CAPTURED"));
        gateway.receive(body,SECRET);
        assertThat(jdbc.queryForObject("SELECT reason FROM sepay_gateway_events WHERE invoice=?",String.class,f.checkout.invoice())).isEqualTo("AMOUNT_MISMATCH");
        when(gatewayClient.retrieve(f.checkout.invoice())).thenReturn(gatewayRemote(f,f.order.getTotalAmount(),"PENDING"));
        assertThatThrownBy(()->gateway.receive(gatewayPayload(f,"tx"+IDS.incrementAndGet(),f.order.getTotalAmount(),Instant.now()),SECRET)).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        var sb=json.readTree(body);((com.fasterxml.jackson.databind.node.ObjectNode)sb.path("order")).put("order_invoice_number","APTISSB"+"A".repeat(32));
        assertThatThrownBy(()->gateway.receive(json.writeValueAsBytes(sb),SECRET)).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isFalse();
        assertThat(access.hasPremiumAccess(f.user.getId())).isFalse();
    }
    @Test void liveGatewayApiFailureAndActivationFailureRollBackThenRetryWorks() throws Exception {
        GatewayFixture f=gatewayFixture(false);String txId="tx"+IDS.incrementAndGet();byte[] body=gatewayPayload(f,txId,f.order.getTotalAmount(),Instant.now());
        when(gatewayClient.retrieve(f.checkout.invoice())).thenThrow(new vn.weconex.aptis.common.exception.ApiException(vn.weconex.aptis.common.exception.ErrorCode.PAYMENT_PROVIDER_ERROR,"Test outage"));
        assertThatThrownBy(()->gateway.receive(body,SECRET)).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sepay_gateway_events WHERE invoice=?",Integer.class,f.checkout.invoice())).isZero();
        String itemId=jdbc.queryForObject("SELECT id FROM order_items WHERE order_id=?",String.class,f.order.getId());
        String planId=jdbc.queryForObject("SELECT item_id FROM order_items WHERE id=?",String.class,itemId);
        jdbc.update("UPDATE order_items SET item_id=? WHERE id=?",UUID.randomUUID().toString(),itemId);
        doAnswer(invocation->gatewayRemote(f,f.order.getTotalAmount(),"CAPTURED")).when(gatewayClient).retrieve(f.checkout.invoice());
        assertThatThrownBy(()->gateway.receive(body,SECRET)).isInstanceOf(Exception.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sepay_gateway_events WHERE invoice=?",Integer.class,f.checkout.invoice())).isZero();
        assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isFalse();
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE order_id=?",String.class,f.order.getId())).isEqualTo("PENDING");
        jdbc.update("UPDATE order_items SET item_id=? WHERE id=?",planId,itemId);gateway.receive(body,SECRET);
        assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isTrue();
    }
    @Test void liveGatewayLateDeliveryUsesPaymentTimeNotArrivalTime() throws Exception {
        GatewayFixture f=gatewayFixture(false);attest(f);Instant paidAt=Instant.now();
        jdbc.update("UPDATE orders SET status='EXPIRED',expires_at=? WHERE id=?",java.sql.Timestamp.from(paidAt.plusSeconds(1)),f.order.getId());
        gateway.receive(gatewayPayload(f,"tx"+IDS.incrementAndGet(),f.order.getTotalAmount(),paidAt),SECRET);
        assertThat(orders.findById(f.order.getId()).orElseThrow().isPaid()).isTrue();
        GatewayFixture late=gatewayFixture(true);attest(late);
        jdbc.update("UPDATE orders SET status='EXPIRED',expires_at=UTC_TIMESTAMP()-INTERVAL 1 MINUTE WHERE id=?",late.order.getId());
        gateway.receive(gatewayPayload(late,"tx"+IDS.incrementAndGet(),late.order.getTotalAmount(),Instant.now()),SECRET);
        assertThat(orders.findById(late.order.getId()).orElseThrow().isPaid()).isFalse();
        assertThat(jdbc.queryForObject("SELECT reason FROM sepay_gateway_events WHERE invoice=?",String.class,late.checkout.invoice())).isEqualTo("PAYMENT_OUTSIDE_ORDER_WINDOW");
    }
    @Test void liveGatewayTransactionReuseAndVoidNeverGrantAnotherProduct() throws Exception {
        GatewayFixture f=gatewayFixture(false);attest(f);String txId="tx"+IDS.incrementAndGet();gateway.receive(gatewayPayload(f,txId,f.order.getTotalAmount(),Instant.now()),SECRET);
        GatewayFixture second=gatewayFixture(true);attest(second);
        assertThatThrownBy(()->gateway.receive(gatewayPayload(second,txId,second.order.getTotalAmount(),Instant.now()),SECRET)).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        var voidBody=json.readTree(gatewayPayload(second,"tx"+IDS.incrementAndGet(),second.order.getTotalAmount(),Instant.now()));
        ((com.fasterxml.jackson.databind.node.ObjectNode)voidBody).put("notification_type","TRANSACTION_VOID");
        gateway.receive(json.writeValueAsBytes(voidBody),SECRET);
        assertThat(orders.findById(second.order.getId()).orElseThrow().isPaid()).isFalse();
        assertThat(jdbc.queryForObject("SELECT reason FROM sepay_gateway_events WHERE invoice=?",String.class,second.checkout.invoice())).isEqualTo("VOID_REQUIRES_ADMIN_REVIEW");
    }
}
