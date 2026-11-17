#!/bin/sh
# Fork in scenario mode, reachable from a phone with no setup:
#   http://<this-mac>.local:4193/dev  (home Wi-Fi)  or the Mac's Tailscale name.
cd "$(dirname "$0")/.."
LOG=/tmp/fork-dev.log
pkill -f "sf dev --port 4192" 2>/dev/null; pkill -f lan-proxy.mjs 2>/dev/null; sleep 1
FORK_SCENARIOS=1 sf dev --port 4192 --watch > "$LOG" 2>&1 &
for i in $(seq 1 40); do KEY=$(grep -o 'zero-dev-capability=[^ ]*' "$LOG" | head -1 | cut -d= -f2); [ -n "$KEY" ] && break; sleep 1; done
[ -z "$KEY" ] && { echo "sf dev didn't start; see $LOG"; exit 1; }
FORK_DEV_KEY="$KEY" nohup node tools/lan-proxy.mjs > /tmp/fork-proxy.log 2>&1 &
sleep 1; echo "Open http://$(scutil --get LocalHostName | tr A-Z a-z).local:4193/dev"
