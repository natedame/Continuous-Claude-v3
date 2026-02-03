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
- Check status of ALL services (statusboard shows current state)
- Review log files in /tmp/*.log for errors, warnings, patterns
- Check Docker container health: `docker ps -a`
- Verify MCP server connections (check LibreChat logs for reconnections)
- Check database health (PostgreSQL, MongoDB, SQLite)

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
- Check running swarms with `swarm-ls`
- Verify swarm health metrics (memory, CPU, heap usage)
- Check tmux responsiveness in each swarm
- Review PLAN.md files for stuck or blocked work
- Identify resource contention issues

### 4. Configuration Audit
- Review /Users/natedame/CLAUDE.md for accuracy and completeness
- Check swarm CLAUDE.md files in worktrees for consistency
- Verify ~/.zshrc swarm functions are correct
- Verify environment variables and secrets management

### 5. Port Management System
Port issues frequently cause bugs. The system uses `ports.yaml` as source of truth.

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

**Hard-coded Port Detection:**
```bash
grep -rn "PORT\s*=\s*[0-9]" ~/local-ai/*/src --include="*.ts" | grep -v "process.env"
grep -rn "localhost:[0-9]" ~/local-ai/*/src --include="*.ts" --include="*.tsx"
```

### 6. CAO & Swarm Configuration
CAO (CLI Agent Orchestrator) manages multi-agent swarms. Version mismatches cause silent failures.

**Swarm Startup Prerequisites:**
```bash
# Check onboarding bypass file exists
cat ~/.claude-swarm.json | grep -E "bypassPermissionsModeAccepted|hasCompletedOnboarding"

# Verify mount in zshrc
grep ".claude-swarm.json" ~/.zshrc
```

**CAO Version Compatibility:**
```bash
# Host Claude version
claude --version

# Container Claude version (in running swarm)
docker exec <swarm> claude --version

# Check CAO prompt pattern matches Claude's prompt character
# Claude uses ❯ (U+276F), not > (U+003E)
docker exec <swarm> grep "IDLE_PROMPT_PATTERN" /home/swarm/.local/share/uv/tools/cli-agent-orchestrator/lib/python3.11/site-packages/cli_agent_orchestrator/providers/claude_code.py
```

**If CAO times out with WAITING_USER_ANSWER:**
1. Check if Claude shows onboarding prompt (theme selection)
2. Check if Claude shows bypass permissions prompt
3. Check if CAO pattern matches Claude's prompt character

**Agent Profiles:**
```bash
ls ~/.aws/cli-agent-orchestrator/agent-context/
# Should have: code_supervisor.md, developer.md, reviewer.md
```

### 7. System Resources
- Check host system memory, CPU, disk usage
- Review Docker VM resource allocation
- Check for zombie processes, file descriptor leaks
- Monitor network connections and port usage
- Check for orphaned containers or volumes

### 7. Disaster Recovery
- Verify backup strategy exists and is documented
- Check what data is being backed up
- Verify recovery procedures are documented
- Test that critical services can be restored

### 8. Statusboard Metrics
- Review current metrics being tracked
- Identify gaps in monitoring coverage
- Check alert thresholds are appropriate
- Verify historical data is being collected

### 9. Autonomy Resource Limits (Forever Autonomous)
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
- Caddyfile: `/Users/natedame/local-ai/Caddyfile`
- Swarm config: `~/.claude-swarm.json`, `~/.claude-swarm/`
- CAO agent profiles: `~/.aws/cli-agent-orchestrator/agent-context/`
- Pre-commit hook: `/Users/natedame/local-ai/.git/hooks/pre-commit`

## Scheduled Usage

Run weekly or after any incident to:
1. Catch false diagnoses before they propagate
2. Verify recommended fixes were implemented
3. Track infrastructure health trends
4. Continuously improve the audit process itself
