#!/usr/bin/env bash
# Serve the static anthology locally and open the Grand Tour in the default browser.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
port="${AETHER_PORT:-4173}"
url="http://127.0.0.1:${port}/grand-tour.html"

cleanup() {
  kill "${server_pid}" 2>/dev/null || true
}

python3 -m http.server "${port}" --bind 127.0.0.1 --directory "${root}" &
server_pid=$!
trap cleanup EXIT INT TERM

if [[ "${AETHER_NO_OPEN:-0}" != "1" ]]; then
  if [[ -n "${BROWSER:-}" ]]; then
    "${BROWSER}" "${url}" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}" >/dev/null 2>&1 || true
  fi
fi

printf 'Æther is running at %s\nPress Ctrl+C to stop the local server.\n' "${url}"
wait "${server_pid}"
