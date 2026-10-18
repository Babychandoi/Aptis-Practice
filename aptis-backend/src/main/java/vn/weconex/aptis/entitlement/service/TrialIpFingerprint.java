package vn.weconex.aptis.entitlement.service;

import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;

/** Numeric literals only (never DNS). IPv4 exact; IPv6 grouped by /64. */
public final class TrialIpFingerprint {
    private TrialIpFingerprint() {}

    public static Optional<String> of(String ip) {
        return address(ip).filter(TrialIpFingerprint::isPublicUnicast).map(bytes -> {
            String key = bytes.length == 4 ? "v4:" + HexFormat.of().formatHex(bytes)
                    : "v6:" + HexFormat.of().formatHex(bytes, 0, 8);
            try {
                return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                        .digest(key.getBytes(StandardCharsets.UTF_8)));
            } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
        });
    }

    public static Optional<byte[]> address(String ip) {
        if (ip == null || ip.length() > 45 || !ip.equals(ip.strip())) return Optional.empty();
        try {
            if (!ip.contains(":")) {
                String[] octets = ip.split("\\.", -1);
                if (octets.length != 4) return Optional.empty();
                byte[] bytes = new byte[4];
                for (int i = 0; i < 4; i++) {
                    if (!octets[i].matches("0|[1-9][0-9]{0,2}")) return Optional.empty();
                    int number = Integer.parseInt(octets[i]);
                    if (number > 255) return Optional.empty();
                    bytes[i] = (byte) number;
                }
                return Optional.of(bytes);
            }
            if (!ip.matches("[a-fA-F0-9:.]+")) return Optional.empty();
            return Optional.of(InetAddress.getByName(ip).getAddress());
        } catch (java.net.UnknownHostException | NumberFormatException ex) { return Optional.empty(); }
    }

    private static boolean isPublicUnicast(byte[] bytes) {
        try {
            InetAddress ip = InetAddress.getByAddress(bytes);
            if (ip.isAnyLocalAddress() || ip.isLoopbackAddress() || ip.isLinkLocalAddress()
                    || ip.isSiteLocalAddress() || ip.isMulticastAddress()) return false;
            if (bytes.length == 16) return (bytes[0] & 0xfe) != 0xfc; // unique-local IPv6
            int a = bytes[0] & 255, b = bytes[1] & 255;
            return a != 0 && a < 224 && !(a == 100 && b >= 64 && b <= 127); // CGNAT peer is not a client IP
        } catch (java.net.UnknownHostException ex) { return false; }
    }
}
