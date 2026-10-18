#!/bin/sh
set -eu
# Trust only the tunnel container, never the whole bridge (including its gateway).
# No tunnel in local development is fine: forwarded visitor headers are ignored.
render_peers() {
    peer_ips="$(getent hosts cloudflared 2>/dev/null | awk '{print $1}' | sort -u || true)"
    printf 'map $remote_addr $aptis_trusted_tunnel {\n    default 0;\n'
    for peer in $peer_ips; do
        # Docker DNS yields numeric addresses; reject anything capable of injecting nginx config.
        case "$peer" in *[!0-9a-fA-F:.]*) continue ;; esac
        printf '    "%s" 1;\n' "$peer"
    done
    printf '}\n'
}
render_peers > /etc/nginx/conf.d/10-trusted-tunnel.conf
# The tunnel starts after frontend on a cold boot, and its IP may change when
# recreated. Refresh only this trust map; graceful nginx reload preserves sockets.
(
    while sleep 10; do
        [ -f /var/run/nginx.pid ] || continue
        pending_map="$(mktemp /etc/nginx/conf.d/tunnel-peers.XXXXXX)"
        render_peers > "$pending_map"
        if ! cmp -s "$pending_map" /etc/nginx/conf.d/10-trusted-tunnel.conf; then
            cp /etc/nginx/conf.d/10-trusted-tunnel.conf "$pending_map.previous"
            mv "$pending_map" /etc/nginx/conf.d/10-trusted-tunnel.conf
            if nginx -t >/dev/null 2>&1; then nginx -s reload; else
                mv "$pending_map.previous" /etc/nginx/conf.d/10-trusted-tunnel.conf
            fi
            rm -f "$pending_map.previous"
        else rm -f "$pending_map"; fi
    done
) &
