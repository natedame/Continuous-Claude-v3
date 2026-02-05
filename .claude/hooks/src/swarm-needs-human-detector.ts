/**
 * Swarm Needs Human Detector (Gatekeeper v2)
 *
 * Stop hook that runs when Claude finishes responding.
 * Queries CAO (CLI Agent Orchestrator) API to get terminal status.
 *
 * Classification logic:
 * - status === "processing" -> Claude is still working, don't alert
 * - Any other status -> Alert human via statusboard message queue
 *
 * Statuses that trigger alert:
 * - idle: Ready for input
 * - completed: Claude finished responding
 * - waiting_user_answer: Claude needs human to pick an option
 * - waiting_permission: Waiting for tool permission
 * - error: Unknown state
 *
 * Mitigations based on red team review:
 * - Debouncing: Check status twice with 2s delay
 * - Timeout: 5s max for CAO queries
 * - Rate limiting: Max 3 alerts per 5 minutes per swarm
 * - Error handling: Fail-safe to alerting on errors
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

// Load port from ports.yaml (source of truth)
function getStatusboardPort(): number {
  try {
    // In container: /app/ports.yaml, on host: ~/local-ai/ports.yaml
    const portsPath = existsSync('/app/ports.yaml')
      ? '/app/ports.yaml'
      : join(process.env.HOME || '', 'local-ai', 'ports.yaml');
    const content = readFileSync(portsPath, 'utf8');
    const config = yaml.load(content) as { services: Record<string, { port: number }> };
    return config?.services?.['status-dashboard']?.port ?? 3010;
  } catch {
    return 3010; // fallback
  }
}

// Config
const STATUSBOARD_URL = `http://host.docker.internal:${getStatusboardPort()}`;
const CAO_API_URL = 'http://host.docker.internal:9889';
const CAO_TIMEOUT_MS = 5000;
const DEBOUNCE_DELAY_MS = 2000;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_ALERTS = 3;
const RATE_LIMIT_DIR = '/tmp/gatekeeper-rate-limit';

const KNOWN_STATUSES = ['idle', 'processing', 'completed', 'waiting_user_answer', 'waiting_permission', 'error'];

interface CaoSession {
  id: string;
  name: string;
  status: string;
}

interface CaoTerminal {
  id: string;
  name: string;
  provider: string;
  session_name: string;
  agent_profile: string;
  status: string;
  last_active: string;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get terminal status from CAO API with timeout
 */
async function getTerminalStatus(): Promise<{ status: string | null; terminalId: string | null }> {
  try {
    // Get all sessions
    const sessionsResponse = await fetchWithTimeout(`${CAO_API_URL}/sessions`, CAO_TIMEOUT_MS);
    if (!sessionsResponse.ok) {
      console.error(`[Gatekeeper] Failed to get CAO sessions: ${sessionsResponse.status}`);
      return { status: null, terminalId: null };
    }

    const sessions: CaoSession[] = await sessionsResponse.json();
    if (!Array.isArray(sessions) || sessions.length === 0) {
      console.log('[Gatekeeper] No CAO sessions found');
      return { status: null, terminalId: null };
    }

    // Get terminals from first session
    const sessionName = sessions[0].id;
    const terminalsResponse = await fetchWithTimeout(
      `${CAO_API_URL}/sessions/${sessionName}/terminals`,
      CAO_TIMEOUT_MS
    );
    if (!terminalsResponse.ok) {
      console.error(`[Gatekeeper] Failed to get terminals: ${terminalsResponse.status}`);
      return { status: null, terminalId: null };
    }

    const terminals: CaoTerminal[] = await terminalsResponse.json();
    if (!Array.isArray(terminals) || terminals.length === 0) {
      console.log('[Gatekeeper] No terminals found in session');
      return { status: null, terminalId: null };
    }

    // Get the first terminal's detailed status
    const terminalId = terminals[0].id;
    const terminalResponse = await fetchWithTimeout(
      `${CAO_API_URL}/terminals/${terminalId}`,
      CAO_TIMEOUT_MS
    );
    if (!terminalResponse.ok) {
      console.error(`[Gatekeeper] Failed to get terminal status: ${terminalResponse.status}`);
      return { status: null, terminalId };
    }

    const terminal: CaoTerminal = await terminalResponse.json();

    // Validate status
    const status = terminal.status;
    if (typeof status !== 'string') {
      console.error('[Gatekeeper] Invalid status type from CAO');
      return { status: null, terminalId };
    }

    if (!KNOWN_STATUSES.includes(status)) {
      console.warn(`[Gatekeeper] Unknown status: ${status}, treating as alertable`);
    }

    console.log(`[Gatekeeper] CAO terminal ${terminalId} status: ${status}`);
    return { status, terminalId };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[Gatekeeper] CAO API timeout');
    } else {
      console.error('[Gatekeeper] Error querying CAO API:', err);
    }
    return { status: null, terminalId: null };
  }
}

/**
 * Get status with debouncing - check twice with delay
 */
async function getStatusWithDebounce(): Promise<string | null> {
  const result1 = await getTerminalStatus();
  const status1 = result1.status;

  // If first check shows processing, verify with second check
  if (status1 === 'processing') {
    console.log('[Gatekeeper] First check: processing, verifying...');
    await sleep(DEBOUNCE_DELAY_MS);

    const result2 = await getTerminalStatus();
    const status2 = result2.status;

    // Only trust processing if consistent
    if (status1 === status2) {
      console.log('[Gatekeeper] Status confirmed: processing');
      return 'processing';
    } else {
      console.log(`[Gatekeeper] Status changed: ${status1} -> ${status2}`);
      return status2;
    }
  }

  return status1;
}

/**
 * Check rate limit - returns true if alert should be suppressed
 */
function isRateLimited(swarmName: string): boolean {
  try {
    if (!existsSync(RATE_LIMIT_DIR)) {
      mkdirSync(RATE_LIMIT_DIR, { recursive: true });
    }

    const filePath = join(RATE_LIMIT_DIR, `${swarmName}.json`);
    const now = Date.now();

    let timestamps: number[] = [];
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
          timestamps = data;
        }
      } catch {
        timestamps = [];
      }
    }

    // Filter to recent timestamps within window
    timestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= RATE_LIMIT_MAX_ALERTS) {
      console.log(`[Gatekeeper] Rate limited: ${timestamps.length} alerts in last 5 minutes`);
      return true;
    }

    // Add current timestamp
    timestamps.push(now);
    writeFileSync(filePath, JSON.stringify(timestamps));

    return false;
  } catch (err) {
    console.error('[Gatekeeper] Rate limit check failed:', err);
    return false; // Don't suppress on error
  }
}

/**
 * Get recent output from transcript or tmux for the message content
 */
function getRecentOutput(): string {
  const swarmName = process.env.SWARM_NAME;
  if (!swarmName) {
    return '';
  }

  try {
    // Find the most recent session transcript
    const projectDir = `/home/swarm/.claude/projects/-app-worktrees-${swarmName}`;
    const files = execSync(`ls -t ${projectDir}/*.jsonl 2>/dev/null | head -1`, {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();

    if (files) {
      // Extract last few assistant text messages from the transcript
      const transcriptText = execSync(
        `grep '"type":"assistant"' "${files}" | tail -3 | jq -r '.message.content[] | select(.type == "text") | .text' 2>/dev/null || true`,
        { encoding: 'utf-8', timeout: 5000 }
      );

      if (transcriptText.trim()) {
        return transcriptText.trim();
      }
    }

    // Fall back to tmux capture
    return execSync(
      'tmux capture-pane -t main -p -S -30 2>/dev/null || true',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
  } catch {
    return '';
  }
}

/**
 * Post to statusboard message queue
 */
async function postToMessageQueue(
  swarmName: string,
  message: string,
  status: string
): Promise<void> {
  try {
    // Get ticket name from PLAN.md if available
    let ticketName: string | undefined;
    try {
      const planContent = execSync('head -5 ./PLAN.md 2>/dev/null || true', { encoding: 'utf-8' });
      const titleMatch = planContent.match(/^#\s+(.+)/m);
      if (titleMatch) {
        ticketName = titleMatch[1].trim();
      }
    } catch {}

    // Extract the last meaningful part of the output
    const lines = message.split('\n').filter(l => l.trim());
    const lastLines = lines.slice(-10).join('\n');

    // POST with timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CAO_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${STATUSBOARD_URL}/api/swarm-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          swarmName,
          ticketName,
          message: lastLines || `Swarm stopped (status: ${status})`,
          caoStatus: status,
        }),
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }

    if (!response.ok) {
      console.error(`[Gatekeeper] Failed to post to message queue: ${response.status}`);
      return;
    }

    console.log(`[Gatekeeper] Posted message to queue for ${swarmName} (status=${status})`);
  } catch (err) {
    console.error('[Gatekeeper] Failed to post to message queue:', err);
  }
}

/**
 * Report gatekeeper health to statusboard
 */
async function reportHealth(caoAvailable: boolean, status: string | null): Promise<void> {
  try {
    await fetch(`${STATUSBOARD_URL}/api/gatekeeper-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caoAvailable,
        caoStatus: status,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Silently fail - don't block on health reporting
  }
}

async function main() {
  const swarmName = process.env.SWARM_NAME;

  // Only run in swarm containers
  if (!swarmName) {
    console.log('[Gatekeeper] Not in swarm container (no SWARM_NAME), exiting');
    process.exit(0);
  }

  // Query CAO for terminal status with debouncing
  const status = await getStatusWithDebounce();

  // Report health status
  await reportHealth(status !== null, status);

  // If CAO unavailable, default to alerting (fail-safe)
  if (status === null) {
    console.log('[Gatekeeper] CAO unavailable, checking rate limit before alert');
    if (!isRateLimited(swarmName)) {
      const output = getRecentOutput();
      if (output.length > 20) {
        await postToMessageQueue(swarmName, output, 'unknown');
      }
    }
    process.exit(0);
  }

  // Only skip alert if status is "processing"
  if (status === 'processing') {
    console.log(`[Gatekeeper] Swarm ${swarmName} is PROCESSING - no alert needed`);
    process.exit(0);
  }

  // Check rate limit before alerting
  if (isRateLimited(swarmName)) {
    console.log(`[Gatekeeper] Swarm ${swarmName} rate limited - skipping alert`);
    process.exit(0);
  }

  // All other statuses trigger an alert
  console.log(`[Gatekeeper] Swarm ${swarmName} status=${status} - posting alert`);
  const output = getRecentOutput();
  await postToMessageQueue(swarmName, output || `Status: ${status}`, status);

  process.exit(0);
}

main().catch(err => {
  console.error('[Gatekeeper] Error:', err);
  process.exit(0); // Don't block Claude on errors
});
