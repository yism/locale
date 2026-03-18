#!/bin/sh
set -eu

mode="${1:-stdio}"
url="${2:-http://localhost:8080/mcp}"

case "$mode" in
  stdio)
    cat <<'EOF'
{
  "command": "npx",
  "args": ["capability-policy-authority", "serve-stdio"]
}
EOF
    ;;
  http)
    cat <<EOF
{
  "transport": "streamable_http",
  "url": "${url}"
}
EOF
    ;;
  *)
    echo "usage: emit_mcp_registration.sh [stdio|http] [http-url]" >&2
    exit 1
    ;;
esac
