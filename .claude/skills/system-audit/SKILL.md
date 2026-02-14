---
name: system-audit
description: Comprehensive infrastructure health audit with incident report validation
allowed-tools: [Read, Grep, Glob, Task, Bash, AskUserQuestion, WebSearch]
---

# COMPREHENSIVE SYSTEM & OPERATIONS AUDIT

## Instructions

**REQUIRED: Create tasks for EVERY audit section.** Do not cherry-pick - the audit must be comprehensive.

On startup, create these tasks (use TaskCreate):
1. Service Health & Logs (Section 1)
2. Incident Reports Validation (Section 2)
3. Current Swarms (Section 3)
4. Configuration Audit (Section 4)
5. Port Management (Section 5)
6. Swarm Configuration (Section 6)
7. System Resources (Section 7)
8. Disaster Recovery (Section 8)
9. Monitoring Gap Analysis (Section 9)
10. Swarm Documentation Audits (Section 10)
11. Deploy Infrastructure (Section 11)
12. Autonomy Resource Limits (Section 12)
13. Monitor Infrastructure (Section 13)
14. Meta-Audit (Self-Improvement)
14b. Swarm Cognitive Load Reduction Audit (Section 14b)
15. Log Audit Completion

Work through tasks in order, marking each complete before moving to the next.

## Audit Scope

### 1. Service Health & Logs

**Automated Service Health Check:**
```bash
~/local-ai/bin/service-health              # Full health check
~/local-ai/bin/service-health --logs       # Include log file analysis
~/local-ai/bin/service-health --json       # JSON output for automation
```

The service-health script checks:
- HTTP endpoints from ports.yaml (or fallback list)
- Docker container status and health
- PostgreSQL database connectivity
- Port conflicts

**Manual checks (if needed):**
- Review log files in /tmp/*.log for errors, warnings, patterns
- Verify MCP server connections (check LibreChat logs for reconnections)

### 2. Past Incident Reports - WITH VALIDATION

Review `~/swarm-admin/incidents/` and `~/swarm-admin/incidents/notes/`

**CRITICAL: Validate each diagnosis, don't just accept it.**

For EACH incident report:
1. Extract the stated "root cause"
2. **Challenge the diagnosis:**
   - Is this a named bug or just a symptom observation? (e.g., "wait_woken" is a kernel state, not a bug name)
   - Was causation proven, or just correlation? (X running when crash happened ≠ X caused crash)
   - For "fixed in version Y" claims - verify in changelog that fix exists
   - For named bugs - search issue tracker to confirm bug exists
3. **Flag unverified claims** for re-investigation
4. Check if recommended fixes were actually implemented

| Red Flag Pattern | Example | Verification |
|------------------|---------|--------------|
| Kernel state as bug name | "wait_woken bug" | Search issue tracker |
| Correlation as causation | "tmux was running" | Look for alternative causes |
| Unverified fix claims | "Fixed in 3.6a" | Check changelog |
| Missing evidence | "No FD leaks" | Re-check with different patterns |

**2b. Stray Incident File Cleanup:**

Host incident reports belong ONLY in `~/swarm-admin/incidents/`. Scan for any `incidents/` directories that aren't the canonical one (ignore worktrees - those are swarm territory):

```bash
find ~ -maxdepth 4 -type d -name "incidents" ! -path "*/swarm-admin/*" ! -path "*/worktrees/*" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null
```

For any found: check for `.md` files (excluding README.md). Move unique host incident reports to `~/swarm-admin/incidents/`, then ensure the stray folder has a redirect README.md pointing to the correct location.

### 3. Current Swarms

**Automated Swarm Health Check:**
```bash
~/local-ai/bin/swarm-health              # Full health check all swarms
~/local-ai/bin/swarm-health --swarm NAME # Check specific swarm
~/local-ai/bin/swarm-health --json       # JSON output for automation
```

The swarm-health script checks per-swarm:
- Container status and uptime
- SWARM_MAX_AGENTS environment variable
- PID limits (docker inspect)
- Memory usage (docker stats)
- Tmux responsiveness
- Orphan tmux windows
- PLAN.md for BLOCKED/STUCK markers
- Stale debug logs (>7 days)

Global checks:
- Total Docker memory usage
- NOTE: Worktree orphan detection is in Section 10f (worktree-audit), which correctly
  uses ticket status. A worktree without a running container is NORMAL — containers
  come and go between sessions. Only worktrees with closed/done tickets are orphaned.

**Manual checks (if needed):**
- Detailed PLAN.md review for specific blockers
- Resource contention analysis

### 4. Configuration Audit
- Review /Users/natedame/CLAUDE.md for accuracy and completeness
- Check swarm CLAUDE.md files in worktrees for consistency
- Verify ~/.zshrc swarm functions are correct
- Verify environment variables and secrets management

### 5. Port Management System
Port issues frequently cause bugs. The system uses `ports.yaml` as source of truth.

**Comprehensive Port Audit:**
```bash
~/local-ai/bin/port-audit              # Full audit with categorized results
~/local-ai/bin/port-audit --fix-only   # Only show must-fix items
~/local-ai/bin/port-audit --summary    # Just the counts
```

The port-audit script scans for ALL port patterns (known AND unknown), categorizes findings as:
- 🔴 MUST FIX - Hardcoded ports in executable code
- 🟡 REVIEW - Docs, configs, tests (may be intentional)
- 🟢 ACCEPTABLE - Uses env var fallback pattern

**Registry Validation:**
```bash
~/local-ai/bin/port validate   # Check for conflicts
~/local-ai/bin/port list       # Show all registered services
```

**Cross-checks:**
- Run `lsof -i -P | grep LISTEN` and compare with `port list`
- Verify Caddy is running: `pgrep -f caddy` and check `~/local-ai/Caddyfile`
- Check Caddy launchd service: `launchctl list | grep caddy`

**Guardrails:**
- Pre-commit hook exists: `ls -la ~/local-ai/.git/hooks/pre-commit`
- Test hook catches bad patterns: `echo 'PORT=9999' | grep -E "PORT\s*=\s*[0-9]+"`
- Swarms have port access: `docker exec <swarm> cat /app/ports.yaml`

### 6. Swarm Configuration
All swarms use Claude's native multi-agent mode (Agent Teams). Verify configuration integrity across host template and running containers.

**6-1. Permissions bypass (settings.json):**
```bash
# For each running swarm, verify permissions.defaultMode
for c in $(docker ps --filter "name=swarm-" --format "{{.Names}}"); do
  echo "=== $c ==="
  docker exec "$c" python3 -c "
import json
s = json.load(open('/home/swarm/.claude/settings.json'))
mode = s.get('permissions',{}).get('defaultMode')
print('✓' if mode == 'bypassPermissions' else '✗', 'permissions.defaultMode:', mode)
" 2>/dev/null || echo "✗ Could not read settings.json"
done
```

**6-2. Wrapper binary integrity:**
```bash
# The claude binary should be a wrapper that injects --dangerously-skip-permissions
# npm updates in entrypoint can overwrite this — entrypoint should restore it
for c in $(docker ps --filter "name=swarm-" --format "{{.Names}}"); do
  echo "=== $c ==="
  docker exec "$c" head -3 $(docker exec "$c" which claude 2>/dev/null) 2>/dev/null
  # Expected: #!/bin/bash + exec ...claude-original --dangerously-skip-permissions "$@"
done
```

**6-3. Team mode settings:**
```bash
for c in $(docker ps --filter "name=swarm-" --format "{{.Names}}"); do
  echo "=== $c ==="
  docker exec "$c" python3 -c "
import json
s = json.load(open('/home/swarm/.claude/settings.json'))
tm = s.get('teammateMode')
exp = s.get('env',{}).get('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS')
print('✓' if tm == 'tmux' else '✗', 'teammateMode:', tm)
print('✓' if exp == '1' else '✗', 'AGENT_TEAMS env:', exp)
" 2>/dev/null || echo "✗ Could not read settings.json"
done
```

**6-4. Host template integrity:**
```bash
# The host template must have correct format — all new swarms copy from this
python3 -c "
import json
s = json.load(open('$HOME/.claude-swarm/settings.json'))
mode = s.get('permissions',{}).get('defaultMode')
print('✓' if mode == 'bypassPermissions' else '✗', 'Host template permissions.defaultMode:', mode)
"
```

**6-5. Hooks configured correctly:**
```bash
# Verify hooks exist in host template
python3 -c "
import json
s = json.load(open('$HOME/.claude-swarm/settings.json'))
hooks = s.get('hooks', {})
print('✓' if hooks else '✗', 'Hooks configured:', bool(hooks))
"
```

**6-6. Per-swarm config directory audit:**
```bash
# Scan ~/.claude-swarm-*/settings.json for expected structure
# These directories are created per-swarm and can drift from the template
for d in ~/.claude-swarm-*/; do
  [ -d "$d" ] || continue
  name=$(basename "$d")
  if [ -f "$d/settings.json" ]; then
    python3 -c "
import json, sys
s = json.load(open('$d/settings.json'))
mode = s.get('permissions',{}).get('defaultMode')
exp = s.get('env',{}).get('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS')
issues = []
if mode != 'bypassPermissions': issues.append('missing permissions.defaultMode')
if exp != '1': issues.append('missing AGENT_TEAMS env')
if issues:
  print('✗', '$name:', ', '.join(issues))
else:
  print('✓', '$name: OK')
" 2>/dev/null
  else
    echo "✗ $name: no settings.json"
  fi
done
```

**Reference:** Incident `2026-02-06-team-swarm-permissions-bypass-broken.md` — npm update overwrote wrapper, settings had wrong format, swarms prompted for permissions.

### 7. System Resources
- Check host system memory, CPU, disk usage
- Review Docker VM resource allocation
- Check for zombie processes, file descriptor leaks
- Monitor network connections and port usage
- Check for orphaned containers or volumes

**NPM Security Audit:**
```bash
# Check key projects for vulnerabilities
for proj in ~/local-ai/services/status-dashboard ~/local-ai/content-need-manager ~/local-ai/langgraph-server; do
  if [ -f "$proj/package.json" ]; then
    echo "=== $(basename $proj) ===" && cd "$proj" && npm audit --audit-level=high 2>/dev/null | head -20
  fi
done
```

Flag HIGH or CRITICAL vulnerabilities for immediate action.

**Docker Image Freshness:**
```bash
# Check base image ages (images older than 90 days may have security issues)
docker images --format "{{.Repository}}:{{.Tag}} - {{.CreatedSince}}" | grep -E "months|year"

# Check specific base images
docker inspect --format='{{.Created}}' node:20-alpine 2>/dev/null || echo "Image not pulled"
```

Flag images older than 90 days for update consideration.

### 8. Disaster Recovery

**Automated Disaster Recovery Check:**
```bash
~/local-ai/bin/disaster-recovery-check       # Full backup health check
~/local-ai/bin/disaster-recovery-check --json # JSON output for automation
```

The disaster-recovery-check script verifies:
- Backup age (should be <24 hours)
- LaunchD service loaded (com.localai.disaster-recovery)
- All expected directories exist (secrets/, launchagents/, db/, dotfiles-snapshot/)
- Brewfile exists
- Database dumps are recent and non-empty (cnm, cc, letta, mongo)
- All repos have git remotes
- Uncommitted work in key repos (warning)
- Google Drive folders exist (Documents, Desktop, projects)
- Secrets are captured (librechat.env, cnm.env, swarm-launcher.env)

**Manual checks (if needed):**
```bash
# Review recent backup log
tail -30 ~/backups/backup.log

# Check dotfiles repo is current
if [ -d ~/dotfiles/.git ]; then
  cd ~/dotfiles && git status && git log -1 --format="%H %s"
fi
```

**Recovery Gaps Analysis:**
- Identify any new services/configs not covered by backup
- Check for new .env files not in secrets backup
- Verify new LaunchAgents are captured
- Check if any new databases need backup

**Status Dashboard Integration:**
- Verify "Disaster Recovery Backup" appears in status dashboard
- Should show green if backup <24 hours old, red otherwise

### 9. Monitoring Gap Analysis

Use incident history to identify missing metrics and logging.

**For each recent incident report, ask:**
1. **How was it detected?**
   - User report? (bad - should be automated)
   - Accident/luck? (bad - need proactive detection)
   - Automated alert? (good - system working)

2. **What metric would have caught it earlier?**
   - What was the first observable symptom?
   - Could we measure that automatically?

3. **Does that metric exist today?**
   - Check status dashboard
   - Check service logs
   - Check alerting rules

4. **If not, add it to recommendations.**

**Common gaps to check:**

| Incident Pattern | Metric Needed |
|------------------|---------------|
| Swarm stuck/frozen | Heartbeat/activity metric |
| Service silently died | Health endpoint monitoring |
| Disk filled up | Disk usage alerts |
| Memory leak over time | Memory trend tracking |
| Config drift | Config hash comparison |

**Output:** List of recommended new metrics based on incident analysis.

### 10. Swarm Documentation Audits

Swarms interpret documentation literally. Outdated or misleading docs cause confusion and wasted work.

**Reference:** `~/swarm-admin/docs/swarm-documentation-principles.md` (source of truth for swarm docs)

**10a. Playwright Documentation Audit:**
```bash
~/local-ai/bin/playwright-docs-audit scan      # Find all Playwright mentions
~/local-ai/bin/playwright-docs-audit report    # Summary with central doc status
~/local-ai/bin/playwright-docs-audit cleanup   # Find files needing fixes
```

Key checks:
- CLAUDE.md links to central doc (`playwright-service/README.md`)
- No files show `npx playwright test` without swarm container warning
- Task docs point to Playwright Service API, not direct execution

**PLAN.template.md:** Also verify `~/local-ai/PLAN.template.md` stays correct:
- E2E test guidance points to Playwright Service
- No outdated path references
- Template copied correctly to new swarms

**Guardrail (swarms don't know about this):**
- Hook: `~/.claude-swarm/hooks/dist/playwright-guard.mjs`
- Blocks direct `npx playwright test` in swarm containers
- Redirects swarm to use Playwright Service API instead

Reference: Incident `2026-02-02-playwright-confusion.md` - swarms tried running Playwright directly in containers.

**10b. Root Directory Hygiene Audit:**
```bash
~/local-ai/bin/swarm-leakage-audit              # Full audit
~/local-ai/bin/swarm-leakage-audit json         # JSON output for automation
```

Detects swarm files that leaked into main local-ai:
- Work products: `PLAN.md`, `MISSION.md`, `SESSION_*.md`, `TASK*.md`
- Duplicate docs (files also in swarm-admin/docs)
- Temp files: `nohup.out`, `*.log` in root
- Planning artifacts: `IMPLEMENTATION_*.md`, `RESEARCH_*.md`, etc.
- Orphaned directories not in known-good list
- Files with swarm-specific markers (`$SWARM_NAME`, `/app/worktrees/`)

**10c. Networking Audit:**
```bash
~/local-ai/bin/networking-audit              # Full audit
~/local-ai/bin/networking-audit json         # JSON output
```

Verifies swarm-facing docs use `host.docker.internal` not `localhost`:
- Checks CLAUDE.md files for hardcoded localhost:PORT
- Verifies Mac service ports use host.docker.internal
- Skips common dev ports (3000, 8080, 5173)

**10d. Path Translation Audit:**
```bash
~/local-ai/bin/path-audit              # Full audit
~/local-ai/bin/path-audit json         # JSON output
```

Detects path confusion in swarm documentation:
- Flags deprecated `/app/worktrees/` pattern (old architecture)
- Flags Mac paths (`/Users/...`) in swarm-facing docs
- Verifies `/app/` and `/downloads/` mappings documented

**10e. Environment Variable Audit:**
```bash
~/local-ai/bin/env-var-audit              # Full audit
~/local-ai/bin/env-var-audit json         # JSON output
```

Checks for hardcoded values that should use env vars:
- Flags hardcoded port 3000 (should be `$SWARM_PORT`)
- Flags hardcoded worktree names (should be `$SWARM_NAME`)
- Verifies env var documentation in CLAUDE.md

**10f. Worktree Cleanup Audit:**
```bash
~/local-ai/bin/worktree-audit              # Full audit
~/local-ai/bin/worktree-audit json         # JSON output
```

Cross-references worktrees with status dashboard tickets:
- Flags worktrees with NO associated ticket (orphans)
- Flags worktrees where ticket is closed/done
- Keeps worktrees where ticket is open/started/todo
- Shows active swarm containers

To clean up flagged worktrees:
```bash
# Push branch to GitHub first (preserves history)
cd ~/local-ai && git push origin feature/<worktree-name>
# Then remove worktree
swarm-cleanup <worktree-name>
```

### 11. Deploy Infrastructure Audit

Deploy issues silently break swarm autonomy. These tests catch regressions from incidents on 2026-02-05.

**Automated Deploy Health Check:**
```bash
~/local-ai/bin/deploy-health-check              # Full check
~/local-ai/bin/deploy-health-check --json       # JSON output
```

**If script doesn't exist, run these manual checks:**

**11a. Git Sync Verification:**
```bash
# Verify deploy-service syncs with origin
cd ~/local-ai/content-need-manager
git fetch origin main
LOCAL=$(git rev-parse HEAD)
ORIGIN=$(git rev-parse origin/main)
[ "$LOCAL" = "$ORIGIN" ] && echo "✓ In sync" || echo "✗ Local differs from origin"
```

**11b. LangGraph LaunchAgents:**
```bash
# All three should be loaded (exit code 0)
launchctl list | grep -E "langgraph.server|cloudflare.langgraph-tunnel"
# Expected: com.langgraph.server, com.cloudflare.langgraph-tunnel
# NOT expected: com.langgraph.cors-proxy (removed 2026-02-05)
```

**11c. Stable Tunnel Health:**
```bash
# Tunnel should respond
curl -s --max-time 5 https://langgraph.syllabus.io/ok
# Expected: {"ok":true}

# If 503: cloudflared config missing
cat ~/.cloudflared/config.yml | grep -q "localhost:2024" && echo "✓ Config OK" || echo "✗ Config missing/wrong"
```

**11d. No Competing Processes:**
```bash
# Should find ZERO nohup langgraph processes
pgrep -f "nohup.*langgraph" && echo "✗ Competing nohup process" || echo "✓ No competing processes"

# Only ONE process should own port 2024
lsof -ti:2024 | wc -l
# Expected: 1-2 (server + possibly tsx watch)
```

**11e. LaunchAgent vs nohup Conflicts:**
```bash
# Check for services with LaunchAgents that deploy-service starts with nohup
# This causes competing processes (LaunchAgent restarts what nohup killed)
for plist in ~/Library/LaunchAgents/com.local-ai.*.plist; do
    name=$(basename "$plist" .plist | sed 's/com.local-ai.//')
    keepalive=$(grep -A1 "KeepAlive" "$plist" 2>/dev/null | grep -q "true" && echo "YES" || echo "no")
    loaded=$(launchctl list 2>/dev/null | grep "com.local-ai.$name" > /dev/null && echo "LOADED" || echo "not loaded")
    if [[ "$keepalive" == "YES" && "$loaded" == "LOADED" ]]; then
        # Check if deploy-service uses nohup for this service
        if grep -q "nohup.*$name\|$name.*nohup\|$name)" ~/local-ai/bin/deploy-service 2>/dev/null; then
            echo "⚠️ CONFLICT: $name has LaunchAgent+KeepAlive but deploy-service uses nohup"
        fi
    fi
done
```
Services with conflicts should use `launchctl kickstart -k` instead of nohup.

**Reference:** Incident `2026-02-05_langgraph-server-worktree-changes-not-deployed.md` → Architecture Simplification

**11f. Worktree Git Health:**
```bash
# Check for broken Docker-path worktrees
for wt in ~/local-ai/worktrees/*/; do
  if [ -f "$wt/.git" ]; then
    gitdir=$(cat "$wt/.git" | grep gitdir | cut -d' ' -f2)
    if [[ "$gitdir" == /app/* ]]; then
      echo "✗ BROKEN: $wt has Docker path: $gitdir"
    fi
  fi
done
```

**11g. Deploy Trigger Running:**
```bash
# Should be running
pgrep -f "deploy-trigger" && echo "✓ Running" || echo "✗ Not running"

# Health endpoint
curl -s http://localhost:3099/health | jq -r '.status'
# Expected: ok
```

**11h. Unpushed Commits Check:**
```bash
# Check key repos for unpushed commits that would be lost on deploy
for repo in ~/local-ai ~/local-ai/langgraph-server ~/local-ai/content-need-manager; do
  cd "$repo"
  unpushed=$(git rev-list origin/main..HEAD --count 2>/dev/null)
  [ "$unpushed" -gt 0 ] && echo "⚠️ $repo has $unpushed unpushed commits"
done
```

**Reference:** Incidents `2026-02-05_deploy-not-pulling-origin-main.md`, `2026-02-05_langgraph-server-worktree-changes-not-deployed.md`

**11i. Git Backup Branch Audit:**
```bash
~/local-ai/bin/git-backup-audit              # Check for backup branches
~/local-ai/bin/git-backup-audit --json       # JSON output for automation
```

Deploy-service creates `backup/*` branches when local has unpushed commits (preserves host Claude's work while allowing swarm deploys to proceed). These branches need to be rebased/pushed and deleted, or they'll be forgotten.

The script checks:
- `~/local-ai` for `backup/*` branches
- `~/projects/PRO-site` for `backup/*` branches
- Reports commits ahead of main, last commit date/subject
- Provides recovery instructions

**Recommended Remediation:**
When backup branches are found, push unique commits to GitHub to preserve them, then delete all local backup branches:
```bash
# For each backup branch with unique commits (commits ahead of main):
git push origin <branch>

# After all unique commits are preserved on GitHub, delete all local backup branches:
git branch | grep 'backup/' | xargs git branch -D

# Also check for non-standard backup branch names:
git branch | grep 'backup-' | xargs git branch -D
```
This is safe because unique commits are preserved on GitHub before local deletion. Do NOT delete before pushing.

**Reference:** Incident `2026-02-05_deploy-auto-push-for-swarm-autonomy.md`

### 12. Autonomy Resource Limits (Forever Autonomous)

Verify the autonomous operation safety systems are working:

**Agent Limits:**
```bash
# Check SWARM_MAX_AGENTS is set in swarm containers
docker exec swarm-<name> env | grep SWARM_MAX_AGENTS
```
- Verify agents block at limit with clear message
- Verify slot reopens when agent completes

**Memory Pressure:**
- Verify 70%/80% warnings fire (check logs)
- Verify 90% blocks spawn tools only (not Read/Edit/Bash)
- Verify `send_message` is never blocked (deadlock prevention)

**Docker PID Limit:**
```bash
docker inspect swarm-<name> --format='{{.HostConfig.PidsLimit}}'
# Expected: 500
```

**Disk Cleanup:**
```bash
# Verify debug logs older than 7 days are cleaned
find ~/.claude-swarm-*/debug -name "*.txt" -mtime +7 -print | head -5
# Verify git gc runs on worktrees
# Verify SQLite vacuum on statusboard DB
```

**Orphan Detection:**
```bash
# Check for tmux windows without active Claude process
docker exec swarm-<name> tmux list-windows -t main -F "#{window_name}"
```

Reference: `~/swarm-admin/incidents/2026-02-02_autonomy-forever-e2e-tests.md`

### 13. Monitor Infrastructure Audit

The monitoring stack (NATS, swarm-monitor, Monitor Claude, monitor.db) is the detection layer for swarm issues. If monitoring is broken, incidents go undetected. This section validates every component end-to-end.

**13a. NATS Container Health:**
```bash
# Verify nats-server container is running
docker ps --filter "name=nats-server" --format "{{.Names}} {{.Status}}"
# Expected: nats-server Up ...

# Verify NATS port is responsive (port looked up dynamically)
NATS_PORT=$(~/local-ai/bin/port get nats)
nc -z localhost "$NATS_PORT" && echo "✓ NATS port $NATS_PORT responsive" || echo "✗ NATS port $NATS_PORT not responding"

# Verify auth is enabled (config file exists with authorization block)
if [ -f ~/local-ai/nats/nats-server.conf ]; then
  grep -q 'authorization' ~/local-ai/nats/nats-server.conf && echo "✓ NATS auth configured" || echo "✗ NATS auth NOT configured"
else
  echo "✗ CRITICAL: nats-server.conf missing at ~/local-ai/nats/nats-server.conf"
fi
```
- CRITICAL if container not running or port unresponsive
- HIGH if auth not configured (unauthenticated pub/sub)
- MEDIUM if config file missing

**13b. swarm-monitor LaunchAgent:**
```bash
# Verify LaunchAgent is loaded
launchctl list | grep swarm-monitor
# Expected: PID listed for com.local-ai.swarm-monitor

# Check heartbeat freshness (should be within last 3 minutes)
LAST_HB=$(sqlite3 ~/.statusboard/monitor.db "SELECT MAX(timestamp) FROM monitor_heartbeats WHERE component='swarm-monitor'")
echo "Last swarm-monitor heartbeat: $LAST_HB"
# Compare with current time — stale heartbeat means monitor is not running

# Calculate staleness in seconds
if [ -n "$LAST_HB" ]; then
  LAST_EPOCH=$(date -j -f "%Y-%m-%d %H:%M:%S" "$LAST_HB" "+%s" 2>/dev/null || date -d "$LAST_HB" "+%s" 2>/dev/null)
  NOW_EPOCH=$(date "+%s")
  DIFF=$(( NOW_EPOCH - LAST_EPOCH ))
  [ "$DIFF" -le 180 ] && echo "✓ Heartbeat fresh (${DIFF}s ago)" || echo "✗ Heartbeat STALE (${DIFF}s ago)"
fi
```
- CRITICAL if LaunchAgent not loaded (no monitoring at all)
- HIGH if heartbeat older than 3 minutes (monitor may have crashed)

**13c. Monitor Claude Liveness:**
```bash
# Check for pending alerts that need Monitor Claude attention
PENDING=$(sqlite3 ~/.statusboard/monitor.db "SELECT COUNT(*) FROM monitor_actions WHERE decision_level='PENDING'")
echo "Pending alerts: $PENDING"

# If pending alerts exist, verify Monitor Claude tmux session is alive
if [ "$PENDING" -gt 0 ]; then
  tmux has-session -t monitor-claude 2>/dev/null && echo "✓ monitor-claude session exists" || echo "✗ CRITICAL: monitor-claude session MISSING with $PENDING pending alerts"
fi
```
- CRITICAL if pending alerts exist but monitor-claude session is missing
- MEDIUM if no pending alerts (session not required)

**13d. monitor.db Integrity:**
```bash
# WAL mode check (should be "wal" for concurrent reads)
JOURNAL=$(sqlite3 ~/.statusboard/monitor.db "PRAGMA journal_mode")
echo "Journal mode: $JOURNAL"
[ "$JOURNAL" = "wal" ] && echo "✓ WAL mode enabled" || echo "✗ Not in WAL mode: $JOURNAL"

# Schema version check (should be >= 2)
SCHEMA_VER=$(sqlite3 ~/.statusboard/monitor.db "PRAGMA user_version")
echo "Schema version: $SCHEMA_VER"
[ "$SCHEMA_VER" -ge 2 ] && echo "✓ Schema version OK ($SCHEMA_VER)" || echo "✗ Schema version too low: $SCHEMA_VER (expected >= 2)"

# Backup timestamp via disaster recovery
~/local-ai/bin/disaster-recovery-check 2>/dev/null | grep -i "monitor\|statusboard" || echo "Check DR backup includes monitor.db"
```
- HIGH if not in WAL mode (concurrent access may corrupt)
- HIGH if schema version < 2 (missing tables/columns)
- MEDIUM if backup timestamp is stale

**13e. rules.yaml Validation:**
```bash
# Verify rules file exists
if [ -f ~/swarm-admin/sidecar/rules.yaml ]; then
  echo "✓ rules.yaml exists"
  # Basic YAML parse test
  python3 -c "import yaml; yaml.safe_load(open('$HOME/swarm-admin/sidecar/rules.yaml'))" 2>&1 && echo "✓ YAML parses OK" || echo "✗ YAML parse error"
  # Count rules defined
  grep -c '^\s*- pattern:' ~/swarm-admin/sidecar/rules.yaml || echo "No pattern rules found"
else
  echo "✗ CRITICAL: rules.yaml missing at ~/swarm-admin/sidecar/rules.yaml"
fi
```
- CRITICAL if file missing (no monitoring rules at all)
- HIGH if YAML parse fails (rules won't load)

**13f. Inbox File Count (Monitor Claude Backlog):**
```bash
# Count unprocessed inbox files
INBOX_COUNT=$(ls ~/monitor-claude/inbox/ 2>/dev/null | wc -l | tr -d ' ')
echo "Monitor Claude inbox: $INBOX_COUNT files"

if [ "$INBOX_COUNT" -gt 20 ]; then
  echo "✗ HIGH: $INBOX_COUNT unprocessed files — Monitor Claude may be stuck"
elif [ "$INBOX_COUNT" -gt 10 ]; then
  echo "⚠ MEDIUM: $INBOX_COUNT unprocessed files — Monitor Claude may be falling behind"
else
  echo "✓ Inbox OK ($INBOX_COUNT files)"
fi
```
- HIGH if >20 files (Monitor Claude likely stuck or crashed)
- MEDIUM if >10 files (Monitor Claude may be falling behind)
- LOW if <=10

**13g. Circuit Breaker Status:**
```bash
# Check for RED (critical) actions in last 24 hours
RED_COUNT=$(sqlite3 ~/.statusboard/monitor.db "SELECT COUNT(*) FROM monitor_actions WHERE decision_level='RED' AND timestamp > datetime('now', '-24 hours')")
echo "RED-level actions in last 24h: $RED_COUNT"

if [ "$RED_COUNT" -gt 0 ]; then
  echo "⚠ Recent critical actions detected — review:"
  sqlite3 ~/.statusboard/monitor.db "SELECT timestamp, action_type, summary FROM monitor_actions WHERE decision_level='RED' AND timestamp > datetime('now', '-24 hours') ORDER BY timestamp DESC LIMIT 5"
fi
```
- HIGH if RED actions in last 24h (indicates active incidents)
- Review each RED action to determine if it was resolved

**13h. Docker Log Rotation:**
```bash
# Verify log rotation config on swarm containers
for c in $(docker ps --filter "name=swarm-" --format "{{.Names}}"); do
  LOG_CONFIG=$(docker inspect --format '{{json .HostConfig.LogConfig}}' "$c" 2>/dev/null)
  if echo "$LOG_CONFIG" | grep -q '"max-size"'; then
    MAX_SIZE=$(echo "$LOG_CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Config',{}).get('max-size','UNSET'))" 2>/dev/null)
    echo "✓ $c: log max-size=$MAX_SIZE"
  else
    echo "✗ $c: NO log rotation configured"
  fi
done
```
- MEDIUM if any swarm container lacks `max-size` log config (disk fill risk)
- Expected: `max-size=10m` on all swarm containers

**13i. monitor-maintenance LaunchAgent:**
```bash
# Verify maintenance LaunchAgent is loaded
launchctl list | grep monitor-maintenance
# Expected: PID or exit-code listed for com.local-ai.monitor-maintenance

if launchctl list 2>/dev/null | grep -q "com.local-ai.monitor-maintenance"; then
  echo "✓ monitor-maintenance LaunchAgent loaded"
else
  echo "✗ HIGH: monitor-maintenance LaunchAgent NOT loaded"
fi
```
- HIGH if not loaded (DB maintenance, log rotation, cleanup won't run)

**13j. Feedback Table Orphan Check:**
```bash
# Check for orphaned feedback_links referencing deleted feedback entries
ORPHAN_COUNT=$(sqlite3 ~/.statusboard/monitor.db "
  SELECT COUNT(*) FROM feedback_links fl
  WHERE NOT EXISTS (
    SELECT 1 FROM monitor_feedback mf
    WHERE mf.id = fl.source_id
    AND fl.source_table = 'monitor_feedback'
  )
" 2>/dev/null)
echo "Orphaned feedback links: $ORPHAN_COUNT"

if [ "$ORPHAN_COUNT" -gt 0 ]; then
  echo "⚠ MEDIUM: $ORPHAN_COUNT orphaned feedback_links entries — indicates deleted feedback without cascade"
else
  echo "✓ No orphaned feedback links"
fi
```
- MEDIUM if orphans exist (data integrity issue, not functionally breaking)
- LOW if zero orphans

**13k. log-action.sh Script:**
```bash
# Verify log-action.sh exists and is executable
SCRIPT=~/monitor-claude/scripts/log-action.sh
if [ -f "$SCRIPT" ]; then
  if [ -x "$SCRIPT" ]; then
    echo "✓ log-action.sh exists and is executable"
  else
    echo "✗ HIGH: log-action.sh exists but is NOT executable"
  fi
else
  echo "✗ CRITICAL: log-action.sh missing at ~/monitor-claude/scripts/log-action.sh"
fi
```
- CRITICAL if script missing (Monitor Claude cannot log actions)
- HIGH if not executable (will fail at runtime)

**13l. Claude Code Version Check:**

Check Claude Code version across host and swarm containers. Strategy-aware: respects whether the Dockerfile uses pinned versions or @latest. System-audit should NEVER change the strategy itself.

```bash
# Host version
claude --version 2>/dev/null || echo "claude not installed on host"

# Latest available version
npm view @anthropic-ai/claude-code version 2>/dev/null || echo "cannot check npm registry"

# Dockerfile strategy detection
DOCKERFILE="$HOME/swarm-launcher/Dockerfile"
if grep -q '@anthropic-ai/claude-code@[0-9]' "$DOCKERFILE" 2>/dev/null; then
  echo "STRATEGY: Pinned version"
  PINNED_VERSION=$(grep -oE '@anthropic-ai/claude-code@[0-9][^ \\]+' "$DOCKERFILE" | head -1 | sed 's/@anthropic-ai\/claude-code@//')
  echo "PINNED TO: $PINNED_VERSION"
  LATEST=$(npm view @anthropic-ai/claude-code version 2>/dev/null)
  if [[ -n "$LATEST" && "$PINNED_VERSION" != "$LATEST" ]]; then
    echo "UPDATE AVAILABLE: $PINNED_VERSION -> $LATEST"
  else
    echo "UP TO DATE"
  fi
else
  echo "STRATEGY: Auto-update (@latest)"
  echo "Swarms install latest on image build. No action needed."
fi

# Version in running swarm containers (sample first one)
SAMPLE_CONTAINER=$(docker ps --filter "name=swarm-" --format '{{.Names}}' | head -1)
if [[ -n "$SAMPLE_CONTAINER" ]]; then
  CONTAINER_VERSION=$(docker exec "$SAMPLE_CONTAINER" claude --version 2>/dev/null || echo "unknown")
  echo "CONTAINER VERSION ($SAMPLE_CONTAINER): $CONTAINER_VERSION"
fi
```

**If strategy is "Pinned version" and update is available:**

Update the pin in the Dockerfile and rebuild:

```bash
# Update version pin (only if strategy is pinned)
LATEST=$(npm view @anthropic-ai/claude-code version)
sed -i '' "s/@anthropic-ai\/claude-code@[0-9][^ \\\\]*/@anthropic-ai\/claude-code@${LATEST}/" "$HOME/swarm-launcher/Dockerfile"
cd "$HOME/swarm-launcher" && docker build -t swarm .
# Commit the version bump
git add Dockerfile && git commit -m "chore: bump claude-code to $LATEST" && git push
```

**If strategy is "Auto-update (@latest)":** Report version, no action needed. Do NOT change the strategy.

- HIGH if pinned version is behind latest (security/bug fix gap)
- OK if auto-update strategy (just report current version)
- MEDIUM if host version differs significantly from container version

**13m. Headless Swarm Detection:**

```bash
# Check for swarms with no attached terminal
curl -s http://localhost:$(~/local-ai/bin/port get deploy-trigger)/headless-swarms 2>/dev/null | python3 -m json.tool

# Check sentinel is running
launchctl list | grep swarm-terminal-sentinel

# Check state files
ls -la ~/.cache/swarm-terminals/ 2>/dev/null
```
- MEDIUM if headless swarms detected (user may have lost connection)
- HIGH if sentinel not running (headless detection disabled)

## Execution Process

1. **Phase 1: Audit** - Systematically investigate each area above
2. **Phase 2: Red Team** - Critically analyze findings, identify gaps and assumptions
3. **Phase 3: Fresh Review** - Step back, review from new perspective
4. **Phase 4: Red Team Again** - Challenge conclusions, find edge cases
5. **Phase 5: Consolidate** - Create final report with prioritized recommendations

## Output Requirements

Present a consolidated final report with:
- Executive summary (critical issues, overall health score)
- Findings by category (with severity: CRITICAL/HIGH/MEDIUM/LOW)
- Specific evidence for each finding
- Prioritized action items with effort estimates
- Recommendations for monitoring improvements

## Meta-Audit (SELF-IMPROVEMENT)

**IMPORTANT:** At the end of every audit, audit THIS PROMPT itself:

1. **Coverage Gaps:**
   - What areas were missing from this audit scope?
   - What questions should have been asked but weren't?
   - What new patterns or issues were discovered that future audits should check?

2. **False Positive/Negative Analysis:**
   - Did this audit catch real issues?
   - Did it miss anything obvious?
   - Were any findings later proven wrong?

3. **Process Improvements:**
   - Was the 4-pass red team process effective?
   - Should any phases be added/removed/modified?
   - Are the severity thresholds appropriate?

4. **Update the Prompt:**
   - Provide specific text changes to improve this prompt
   - Save recommendations to: `/Users/natedame/local-ai/AUDIT_PROMPT_RECOMMENDATIONS.md`
   - If changes are approved, update THIS skill file at:
     `/Users/natedame/local-ai/ccv3/.claude/skills/system-audit/SKILL.md`

This ensures the audit improves itself over time.

### 14b. Swarm Cognitive Load Reduction Audit

Swarm Claudes carry cognitive load that could be handled by scripts, APIs, or hooks. This section identifies opportunities to replace "things swarms must know" with programmatic tooling.

**14b-1. Static Information in CLAUDE.md That Could Be Runtime-Queryable:**

```bash
# Count hardcoded ports in swarm CLAUDE.md
grep -c 'host\.docker\.internal:[0-9]' ~/local-ai/CLAUDE.md

# Extract unique hardcoded ports
grep -o 'host\.docker\.internal:[0-9]*' ~/local-ai/CLAUDE.md | sed 's/.*://' | sort -u

# Compare CLAUDE.md ports vs ports.yaml source of truth
echo "=== CLAUDE.md ports ===" && grep -o 'host\.docker\.internal:[0-9]*' ~/local-ai/CLAUDE.md | sed 's/.*://' | sort -u
echo "=== ports.yaml ports ===" && grep -E '^\s+port:' ~/local-ai/ports.yaml | grep -o '[0-9]*' | sort -u

# Check swarm--generate-claude-md for hardcoded ports
grep -n '[0-9]\{4\}' ~/.zshrc | grep -i 'claude.md\|generate'
```

For each hardcoded port found:
- Is this port also in `ports.yaml`? If yes, it should be fetched at runtime via `port get`
- Is this port baked into `swarm--generate-claude-md()` in `~/.zshrc`? If yes, the function should use `port get` instead
- Does the CLAUDE.md value match the current `ports.yaml` value? Mismatches indicate staleness

**14b-2. Information Swarms Must "Know" vs Can Look Up:**

```bash
# Check env-requirements.yaml coverage (how many services have documented env vars)
cat ~/local-ai/env-requirements.yaml 2>/dev/null | grep -c 'service:' || echo "File missing or empty"

# Check if dependency graph exists anywhere in ports.yaml
grep -c 'depends_on\|dependencies' ~/local-ai/ports.yaml

# Check where MCP tools are defined (should be single source of truth)
echo "=== librechat.yaml MCP refs ===" && grep -c 'mcpServers\|mcp_' ~/local-ai/librechat/librechat.yaml 2>/dev/null
echo "=== ports.yaml MCP refs ===" && grep -c 'mcp' ~/local-ai/ports.yaml 2>/dev/null
echo "=== deploy-trigger MCP refs ===" && grep -c 'mcp' ~/local-ai/bin/deploy-trigger.cjs 2>/dev/null

# Check if CLAUDE.md duplicates info available via deploy-trigger /db endpoint
grep -c '/db\|database\|connection string\|postgres' ~/local-ai/CLAUDE.md
```

Audit checklist:
- **Service dependencies**: Is there a machine-readable dependency graph, or must swarms "know" what depends on what?
- **Env var requirements**: How many of the services in `ports.yaml` have entries in `env-requirements.yaml`? Low coverage means swarms discover missing env vars at runtime
- **MCP tool definitions**: Are MCP tools defined in a single place, or spread across librechat.yaml, ports.yaml, and deploy-trigger? Fragmentation means swarms can't reliably query "what tools exist"
- **Database connections**: Does CLAUDE.md duplicate connection info that deploy-trigger `/db` endpoint already provides?

**14b-3. Missing Programmatic Endpoints That Would Reduce Cognitive Load:**

```bash
# Check if deploy-trigger has a GET /services endpoint returning a port map
grep -n 'services\|port.*map\|portMap' ~/local-ai/bin/deploy-trigger.cjs | head -20

# Check if deploy-trigger exposes dependency info
grep -n 'depend\|prerequisite\|requires' ~/local-ai/bin/deploy-trigger.cjs | head -10

# Check if deploy-trigger has service readiness with prerequisite validation
grep -n 'ready\|prereq\|health.*check\|preflight' ~/local-ai/bin/deploy-trigger.cjs | head -10

# Check if deploy responses include feedback on what triggered the deploy
grep -n 'trigger\|webhook\|auto.*deploy\|push.*event' ~/local-ai/bin/deploy-trigger.cjs | head -10
```

For each missing endpoint, assess:
- How often do swarms need this info? (check incident reports and CLAUDE.md references)
- Could this be a simple addition to deploy-trigger?
- What's the current workaround? (parsing CLAUDE.md, asking user, guessing)

**14b-4. Documentation Duplication Across Worktrees:**

```bash
# Count worktree CLAUDE.md copies
find ~/local-ai/worktrees -name "CLAUDE.md" -maxdepth 2 2>/dev/null | wc -l

# Measure divergence from main CLAUDE.md
MAIN_HASH=$(md5 -q ~/local-ai/CLAUDE.md 2>/dev/null || md5sum ~/local-ai/CLAUDE.md | cut -d' ' -f1)
for f in ~/local-ai/worktrees/*/CLAUDE.md; do
  WT_HASH=$(md5 -q "$f" 2>/dev/null || md5sum "$f" | cut -d' ' -f1)
  if [ "$MAIN_HASH" = "$WT_HASH" ]; then
    echo "IDENTICAL: $f"
  else
    DIFF_LINES=$(diff ~/local-ai/CLAUDE.md "$f" | grep -c '^[<>]')
    echo "DIVERGED ($DIFF_LINES lines): $f"
  fi
done
```

Identify:
- Sections identical across ALL worktrees (candidates for shared mount or runtime fetch)
- Sections that diverge per-worktree (legitimate per-feature context)
- Total byte cost of duplication vs a fetch-on-startup approach

**14b-5. Repetitive Swarm Tasks That Could Be Hooks or Scripts:**

```bash
# Check if swarm--preflight-services() exists and what it covers
grep -A 30 'preflight-services\|preflight_services' ~/.zshrc | head -40

# Check for post-push hooks in swarm containers
ls -la ~/local-ai/bin/hooks/ 2>/dev/null

# Check for common manual patterns in incident reports
grep -l 'manually\|had to\|didn.t know\|forgot to' ~/swarm-admin/incidents/*.md 2>/dev/null | head -10
```

Look for:
- Common tasks swarms do manually that could be pre-commit hooks, post-push hooks, or CLI shortcuts
- Services that `swarm--preflight-services()` doesn't cover but swarms need at runtime
- Patterns from incident reports where swarms failed because they didn't know something that could be programmatic

**Output:** For each finding, provide:
1. **What swarms currently must "know"** (the cognitive load)
2. **Proposed programmatic replacement** (script, API endpoint, hook, or runtime query)
3. **Effort estimate** (trivial/small/medium) to implement the replacement
4. **Impact** (how many swarms/how often this cognitive load causes issues)

---

## Files Referenced

- Incident reports: `~/swarm-admin/incidents/*.md`
- Investigation notes: `~/swarm-admin/incidents/notes/`
- Health audit: `/Users/natedame/local-ai/SWARM_HEALTH_AUDIT_REPORT.md`
- Baselines: `/Users/natedame/local-ai/SWARM_INFRASTRUCTURE_BASELINES.md`
- Host instructions: `/Users/natedame/CLAUDE.md`
- Swarm documentation principles: `~/swarm-admin/docs/swarm-documentation-principles.md`
- Autonomy E2E tests: `~/swarm-admin/incidents/2026-02-02_autonomy-forever-e2e-tests.md`
- This skill: `/Users/natedame/local-ai/ccv3/.claude/skills/system-audit/SKILL.md`
- Port registry: `/Users/natedame/local-ai/ports.yaml`
- Port CLI: `/Users/natedame/local-ai/bin/port`
- Port audit: `/Users/natedame/local-ai/bin/port-audit`
- Service health: `/Users/natedame/local-ai/bin/service-health`
- Swarm health: `/Users/natedame/local-ai/bin/swarm-health`
- DR check: `/Users/natedame/local-ai/bin/disaster-recovery-check`
- Playwright docs audit: `/Users/natedame/local-ai/bin/playwright-docs-audit`
- Swarm leakage audit: `/Users/natedame/local-ai/bin/swarm-leakage-audit`
- Networking audit: `/Users/natedame/local-ai/bin/networking-audit`
- Path audit: `/Users/natedame/local-ai/bin/path-audit`
- Env var audit: `/Users/natedame/local-ai/bin/env-var-audit`
- Worktree audit: `/Users/natedame/local-ai/bin/worktree-audit`
- Deploy health check: `/Users/natedame/local-ai/bin/deploy-health-check`
- Git backup audit: `/Users/natedame/local-ai/bin/git-backup-audit`
- Swarm CLAUDE.md (constitution): `~/local-ai/CLAUDE.md`
- Env requirements: `~/local-ai/env-requirements.yaml`
- Deploy trigger: `~/local-ai/bin/deploy-trigger.cjs`
- Zshrc (swarm functions): `~/.zshrc`
- Caddyfile: `/Users/natedame/local-ai/Caddyfile`
- Swarm config template: `~/.claude-swarm/`
- Per-swarm configs: `~/.claude-swarm-*/`
- Pre-commit hook: `/Users/natedame/local-ai/bin/hooks/pre-commit`
- Backup script: `/Users/natedame/local-ai/bin/disaster-recovery-backup.sh`
- Backup launchd: `~/Library/LaunchAgents/com.localai.disaster-recovery.plist`
- Backup output: `~/backups/` (add to Google Drive manually)
- Backup timestamp: `~/backups/last-backup.txt`
- Dotfiles repo: `~/dotfiles/` (if exists)
- System audit log: `/Users/natedame/local-ai/bin/system-audit-log`
- System audit check: `/Users/natedame/local-ai/bin/system-audit-check`
- Audit timestamp: `~/backups/last-system-audit.txt`
- NATS config: `~/local-ai/nats/nats-server.conf`
- Monitor database: `~/.statusboard/monitor.db`
- Monitor rules: `~/swarm-admin/sidecar/rules.yaml`
- Monitor Claude inbox: `~/monitor-claude/inbox/`
- Monitor log-action script: `~/monitor-claude/scripts/log-action.sh`

## Audit Completion Logging

**REQUIRED:** At the end of every audit, log completion for status dashboard tracking:

```bash
~/local-ai/bin/system-audit-log --summary "X issues found, Y critical"
```

This updates the timestamp checked by status dashboard. If audit goes >24 hours stale, dashboard shows warning.

---

## Scheduled Usage

Run weekly or after any incident to:
1. Catch false diagnoses before they propagate
2. Verify recommended fixes were implemented
3. Track infrastructure health trends
4. Continuously improve the audit process itself
