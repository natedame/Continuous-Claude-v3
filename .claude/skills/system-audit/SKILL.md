---
name: system-audit
description: Comprehensive infrastructure health audit with incident report validation
allowed-tools: [Read, Grep, Glob, Task, Bash, AskUserQuestion, WebSearch]
---

# COMPREHENSIVE SYSTEM & OPERATIONS AUDIT

## Instructions

Use tasks to track all audit work. Create a task for each major area, then audit systematically.

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

Review `/Users/natedame/local-ai/incident-reports/` and `/Users/natedame/local-ai/_incident-notes/`

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

### 7. System Resources
- Check host system memory, CPU, disk usage
- Review Docker VM resource allocation
- Check for zombie processes, file descriptor leaks
- Monitor network connections and port usage
- Check for orphaned containers or volumes

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
tail -30 ~/Documents/backups/backup.log

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

### 9. Statusboard Metrics
- Review current metrics being tracked
- Identify gaps in monitoring coverage
- Check alert thresholds are appropriate
- Verify historical data is being collected

### 10. Swarm Documentation Audits

Swarms interpret documentation literally. Outdated or misleading docs cause confusion and wasted work.

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
- PLAN.template.md has correct E2E guidance

Reference: Incident `2026-02-02-playwright-confusion.md` - swarms tried running Playwright directly in containers.

**10b. [Future] Host.docker.internal Audit:**
- Verify all swarm-facing docs use `host.docker.internal` not `localhost`
- Check for hardcoded `localhost` URLs in CLAUDE.md, task docs, READMEs

**10c. [Future] Path Translation Audit:**
- Verify docs show Mac paths for user-facing output (`~/Downloads/`)
- Verify docs show container paths for swarm internal use (`/app/`)
- Check for path confusion in task assignments

**10d. [Future] Environment Variable Audit:**
- Verify `$SWARM_PORT`, `$SWARM_NAME`, etc. documented correctly
- Check for hardcoded ports that should use env vars
- Verify worktree-specific env vars explained

### 11. Autonomy Resource Limits (Forever Autonomous)
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

Reference: `/Users/natedame/local-ai/incident-reports/2026-02-02_autonomy-forever-e2e-tests.md`

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

- Incident reports: `/Users/natedame/local-ai/incident-reports/*.md`
- Investigation notes: `/Users/natedame/local-ai/_incident-notes/`
- Health audit: `/Users/natedame/local-ai/SWARM_HEALTH_AUDIT_REPORT.md`
- Baselines: `/Users/natedame/local-ai/SWARM_INFRASTRUCTURE_BASELINES.md`
- Host instructions: `/Users/natedame/CLAUDE.md`
- Autonomy E2E tests: `/Users/natedame/local-ai/incident-reports/2026-02-02_autonomy-forever-e2e-tests.md`
- This skill: `/Users/natedame/local-ai/ccv3/.claude/skills/system-audit/SKILL.md`
- Port registry: `/Users/natedame/local-ai/ports.yaml`
- Port CLI: `/Users/natedame/local-ai/bin/port`
- Port audit: `/Users/natedame/local-ai/bin/port-audit`
- Service health: `/Users/natedame/local-ai/bin/service-health`
- Swarm health: `/Users/natedame/local-ai/bin/swarm-health`
- CAO config check: `/Users/natedame/local-ai/bin/cao-config-check`
- DR check: `/Users/natedame/local-ai/bin/disaster-recovery-check`
- Playwright docs audit: `/Users/natedame/local-ai/bin/playwright-docs-audit`
- Caddyfile: `/Users/natedame/local-ai/Caddyfile`
- Swarm config: `~/.claude-swarm.json`, `~/.claude-swarm/`
- CAO agent profiles: `~/.aws/cli-agent-orchestrator/agent-context/`
- Pre-commit hook: `/Users/natedame/local-ai/.git/hooks/pre-commit`
- Backup script: `/Users/natedame/local-ai/bin/disaster-recovery-backup.sh`
- Backup launchd: `~/Library/LaunchAgents/com.localai.disaster-recovery.plist`
- Backup output: `~/Documents/backups/` (synced via Google Drive)
- Backup timestamp: `~/Documents/backups/last-backup.txt`
- Dotfiles repo: `~/dotfiles/` (if exists)

## Scheduled Usage

Run weekly or after any incident to:
1. Catch false diagnoses before they propagate
2. Verify recommended fixes were implemented
3. Track infrastructure health trends
4. Continuously improve the audit process itself
