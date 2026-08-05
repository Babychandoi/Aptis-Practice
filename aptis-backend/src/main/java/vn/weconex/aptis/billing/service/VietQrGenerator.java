package vn.weconex.aptis.billing.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.stereotype.Component;

/**
 * Sinh nội dung mã QR chuyển khoản theo chuẩn VietQR (EMVCo TLV).
 *
 * <p>Sinh động kèm số tiền và nội dung chuyển khoản: học viên quét là app ngân
 * hàng điền sẵn hết, không gõ tay nên không sai mã — mã sai thì không đối soát
 * được, tiền về mà không biết của ai.
 *
 * <p>Chỉ trả chuỗi nội dung; việc vẽ thành ảnh do frontend làm.
 */
@Component
public class VietQrGenerator {

    /** ID định danh dịch vụ chuyển nhanh NAPAS 247 bằng số tài khoản. */
    private static final String NAPAS_SERVICE_ACCOUNT = "QRIBFTTA";
    private static final String NAPAS_GUID = "A000000727";

    /**
     * Mã BIN của ngân hàng theo NAPAS — VietQR dùng BIN chứ không dùng mã chữ.
     * Danh sách rút gọn cho các ngân hàng phổ biến.
     */
    private static String binOf(String bankCode) {
        return switch (bankCode == null ? "" : bankCode.toUpperCase(Locale.ROOT)) {
            case "VCB", "VIETCOMBANK" -> "970436";
            case "TCB", "TECHCOMBANK" -> "970407";
            case "MB", "MBBANK" -> "970422";
            case "VTB", "VIETINBANK" -> "970415";
            case "BIDV" -> "970418";
            case "ACB" -> "970416";
            case "VPB", "VPBANK" -> "970432";
            case "TPB", "TPBANK" -> "970423";
            case "SCB" -> "970429";
            case "STB", "SACOMBANK" -> "970403";
            case "HDB", "HDBANK" -> "970437";
            case "VIB" -> "970441";
            case "SHB" -> "970443";
            case "OCB" -> "970448";
            case "MSB" -> "970426";
            case "AGRIBANK", "AGR" -> "970405";
            case "NAB", "NAMABANK" -> "970428";
            case "SEAB", "SEABANK" -> "970440";
            case "EIB", "EXIMBANK" -> "970431";
            case "BVB", "BAOVIETBANK" -> "970438";
            // Không biết BIN thì trả null để caller bỏ QR động, tránh sinh mã
            // sai khiến tiền chuyển nhầm ngân hàng.
            default -> null;
        };
    }

    /**
     * @return chuỗi QR, hoặc null nếu không xác định được ngân hàng
     */
    public String generate(String bankCode, String accountNumber, long amount, String content) {
        String bin = binOf(bankCode);
        if (bin == null || accountNumber == null || accountNumber.isBlank()) {
            return null;
        }

        // Thông tin thụ hưởng: GUID NAPAS + (BIN ngân hàng, số tài khoản)
        String beneficiary = tlv("00", bin) + tlv("01", accountNumber);
        String merchantAccount =
                tlv("00", NAPAS_GUID)
                        + tlv("01", beneficiary)
                        + tlv("02", NAPAS_SERVICE_ACCOUNT);

        StringBuilder payload = new StringBuilder();
        payload.append(tlv("00", "01"));
        // 12 = QR động (dùng một lần, có số tiền); 11 = QR tĩnh
        payload.append(tlv("01", "12"));
        payload.append(tlv("38", merchantAccount));
        payload.append(tlv("53", "704"));            // VND theo ISO 4217
        if (amount > 0) {
            payload.append(tlv("54", String.valueOf(amount)));
        }
        payload.append(tlv("58", "VN"));
        if (content != null && !content.isBlank()) {
            payload.append(tlv("62", tlv("08", sanitize(content))));
        }

        // CRC tính trên toàn chuỗi kể cả "6304", nên nối trước rồi mới tính
        payload.append("6304");
        return payload + crc16(payload.toString());
    }

    /** Bản ghi tag-length-value: tag 2 ký tự, độ dài 2 chữ số, rồi giá trị. */
    private static String tlv(String tag, String value) {
        return tag + String.format("%02d", value.length()) + value;
    }

    /**
     * Nội dung chuyển khoản chỉ nên chứa chữ và số: dấu tiếng Việt và ký tự lạ
     * bị nhiều ngân hàng lược bỏ, làm mã đối soát biến dạng.
     */
    private static String sanitize(String value) {
        String cleaned = value.replaceAll("[^A-Za-z0-9 ]", "").strip();
        return cleaned.length() > 99 ? cleaned.substring(0, 99) : cleaned;
    }

    /** CRC-16/CCITT-FALSE theo yêu cầu của EMVCo. */
    private static String crc16(String data) {
        int crc = 0xFFFF;
        for (byte b : data.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }
        return String.format("%04X", crc);
    }
}
