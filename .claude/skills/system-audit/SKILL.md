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
6. CAO & Swarm Configuration (Section 6)
7. System Resources (Section 7)
8. Disaster Recovery (Section 8)
9. Monitoring Gap Analysis (Section 9)
10. Swarm Documentation Audits (Section 10)
11. Deploy Infrastructure (Section 11)
12. Autonomy Resource Limits (Section 12)
13. Meta-Audit (Self-Improvement)
14. Log Audit Completion

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
- Orphaned worktrees (worktree exists but no swarm running)
- Total Docker memory usage

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

### 6. CAO & Swarm Configuration
CAO (CLI Agent Orchestrator) manages multi-agent swarms. Version mismatches cause silent failures.

**Automated CAO Configuration Check:**
```bash
~/local-ai/bin/cao-config-check          # Full configuration check
~/local-ai/bin/cao-config-check --json   # JSON output for automation
```

The cao-config-check script verifies:
- ~/.claude-swarm.json bypass flags (bypassPermissionsModeAccepted, hasCompletedOnboarding)
- Host Claude version vs container Claude version
- CAO prompt pattern (❯ vs >)
- Agent profiles exist (code_supervisor.md, developer.md, reviewer.md)
- Shell integration (swarm functions in ~/.zshrc)
- CAO installation status

**If CAO times out with WAITING_USER_ANSWER:**
1. Check if Claude shows onboarding prompt (theme selection)
2. Check if Claude shows bypass permissions prompt
3. Check if CAO pattern matches Claude's prompt character

**Manual checks (if needed):**
```bash
# Check CAO prompt pattern in container
docker exec <swarm> grep "IDLE_PROMPT_PATTERN" /home/swarm/.local/share/uv/tools/cli-agent-orchestrator/lib/python*/site-packages/cli_agent_orchestrator/providers/claude_code.py
```

### 6b. Agent Teams Configuration
Agent Teams swarms use Claude's native multi-agent mode instead of CAO. They have different configuration requirements. CAO checks (Section 6 above) do NOT apply to team swarms.

**Identify team swarms:**
```bash
# Team swarms have start-team alias, CAO swarms have start-swarm
for c in $(docker ps --filter "name=cao-swarm" --format "{{.Names}}"); do
  if docker exec "$c" bash -c 'alias' 2>/dev/null | grep -q start-team; then
    echo "TEAM: $c"
  else
    echo "CAO:  $c"
  fi
done
```

**For each team swarm, verify:**

**6b-1. Permissions bypass (settings.json):**
```bash
# Must have permissions.defaultMode — the old bypassPermissions:true alone is insufficient
docker exec <team-swarm> python3 -c "
import json
s = json.load(open('/home/swarm/.claude/settings.json'))
mode = s.get('permissions',{}).get('defaultMode')
print('✓' if mode == 'bypassPermissions' else '✗', 'permissions.defaultMode:', mode)
"
```

**6b-2. Wrapper binary integrity:**
```bash
# The claude binary should be a wrapper that injects --dangerously-skip-permissions
# npm updates in entrypoint can overwrite this — entrypoint should restore it
docker exec <team-swarm> head -3 $(docker exec <team-swarm> which claude)
# Expected: #!/bin/bash + exec ...claude-original --dangerously-skip-permissions "$@"
```

**6b-3. Team mode settings:**
```bash
docker exec <team-swarm> python3 -c "
import json
s = json.load(open('/home/swarm/.claude/settings.json'))
tm = s.get('teammateMode')
exp = s.get('env',{}).get('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS')
print('✓' if tm == 'tmux' else '✗', 'teammateMode:', tm)
print('✓' if exp == '1' else '✗', 'AGENT_TEAMS env:', exp)
"
```

**6b-4. Host template integrity:**
```bash
# The host template must have correct format — all new swarms copy from this
python3 -c "
import json
s = json.load(open('$HOME/.claude-swarm/settings.json'))
mode = s.get('permissions',{}).get('defaultMode')
print('✓' if mode == 'bypassPermissions' else '✗', 'Host template permissions.defaultMode:', mode)
"
```

**Reference:** Incident `2026-02-06-team-swarm-permissions-bypass-broken.md` — npm update overwrote wrapper, settings had wrong format, team swarms prompted for permissions.

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
- Secrets are captured (librechat.env, cnm.env, cao-launcher.env)

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

**Reference:** Incident `2026-02-05_deploy-auto-push-for-swarm-autonomy.md`

### 12. Autonomy Resource Limits (Forever Autonomous)

Verify the autonomous operation safety systems are working:

**Agent Limits:**
```bash
# Check SWARM_MAX_AGENTS is set in swarm containers
docker exec cao-swarm-<name> env | grep SWARM_MAX_AGENTS
```
- Verify agents block at limit with clear message
- Verify slot reopens when agent completes

**Memory Pressure:**
- Verify 70%/80% warnings fire (check logs)
- Verify 90% blocks spawn tools only (not Read/Edit/Bash)
- Verify `send_message` is never blocked (deadlock prevention)

**Docker PID Limit:**
```bash
docker inspect cao-swarm-<name> --format='{{.HostConfig.PidsLimit}}'
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
docker exec cao-swarm-<name> tmux list-windows -t cao -F "#{window_name}"
```

Reference: `~/swarm-admin/incidents/2026-02-02_autonomy-forever-e2e-tests.md`

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
- CAO config check: `/Users/natedame/local-ai/bin/cao-config-check`
- DR check: `/Users/natedame/local-ai/bin/disaster-recovery-check`
- Playwright docs audit: `/Users/natedame/local-ai/bin/playwright-docs-audit`
- Swarm leakage audit: `/Users/natedame/local-ai/bin/swarm-leakage-audit`
- Networking audit: `/Users/natedame/local-ai/bin/networking-audit`
- Path audit: `/Users/natedame/local-ai/bin/path-audit`
- Env var audit: `/Users/natedame/local-ai/bin/env-var-audit`
- Worktree audit: `/Users/natedame/local-ai/bin/worktree-audit`
- Deploy health check: `/Users/natedame/local-ai/bin/deploy-health-check`
- Git backup audit: `/Users/natedame/local-ai/bin/git-backup-audit`
- Caddyfile: `/Users/natedame/local-ai/Caddyfile`
- Swarm config: `~/.claude-swarm.json`, `~/.claude-swarm/`
- CAO agent profiles: `~/.aws/cli-agent-orchestrator/agent-context/`
- Pre-commit hook: `/Users/natedame/local-ai/.git/hooks/pre-commit`
- Backup script: `/Users/natedame/local-ai/bin/disaster-recovery-backup.sh`
- Backup launchd: `~/Library/LaunchAgents/com.localai.disaster-recovery.plist`
- Backup output: `~/backups/` (add to Google Drive manually)
- Backup timestamp: `~/backups/last-backup.txt`
- Dotfiles repo: `~/dotfiles/` (if exists)
- System audit log: `/Users/natedame/local-ai/bin/system-audit-log`
- System audit check: `/Users/natedame/local-ai/bin/system-audit-check`
- Audit timestamp: `~/backups/last-system-audit.txt`

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
