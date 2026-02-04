// src/swarm-needs-human-detector.ts
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
var STATUSBOARD_URL = "http://host.docker.internal:3010";
var CAO_API_URL = "http://host.docker.internal:9889";
var CAO_TIMEOUT_MS = 5e3;
var DEBOUNCE_DELAY_MS = 2e3;
var RATE_LIMIT_WINDOW_MS = 5 * 60 * 1e3;
var RATE_LIMIT_MAX_ALERTS = 3;
var RATE_LIMIT_DIR = "/tmp/gatekeeper-rate-limit";
var KNOWN_STATUSES = ["idle", "processing", "completed", "waiting_user_answer", "waiting_permission", "error"];
async function fetchWithTimeout(url, timeoutMs) {
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
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function getTerminalStatus() {
  try {
    const sessionsResponse = await fetchWithTimeout(`${CAO_API_URL}/sessions`, CAO_TIMEOUT_MS);
    if (!sessionsResponse.ok) {
      console.error(`[Gatekeeper] Failed to get CAO sessions: ${sessionsResponse.status}`);
      return { status: null, terminalId: null };
    }
    const sessions = await sessionsResponse.json();
    if (!Array.isArray(sessions) || sessions.length === 0) {
      console.log("[Gatekeeper] No CAO sessions found");
      return { status: null, terminalId: null };
    }
    const sessionName = sessions[0].id;
    const terminalsResponse = await fetchWithTimeout(
      `${CAO_API_URL}/sessions/${sessionName}/terminals`,
      CAO_TIMEOUT_MS
    );
    if (!terminalsResponse.ok) {
      console.error(`[Gatekeeper] Failed to get terminals: ${terminalsResponse.status}`);
      return { status: null, terminalId: null };
    }
    const terminals = await terminalsResponse.json();
    if (!Array.isArray(terminals) || terminals.length === 0) {
      console.log("[Gatekeeper] No terminals found in session");
      return { status: null, terminalId: null };
    }
    const terminalId = terminals[0].id;
    const terminalResponse = await fetchWithTimeout(
      `${CAO_API_URL}/terminals/${terminalId}`,
      CAO_TIMEOUT_MS
    );
    if (!terminalResponse.ok) {
      console.error(`[Gatekeeper] Failed to get terminal status: ${terminalResponse.status}`);
      return { status: null, terminalId };
    }
    const terminal = await terminalResponse.json();
    const status = terminal.status;
    if (typeof status !== "string") {
      console.error("[Gatekeeper] Invalid status type from CAO");
      return { status: null, terminalId };
    }
    if (!KNOWN_STATUSES.includes(status)) {
      console.warn(`[Gatekeeper] Unknown status: ${status}, treating as alertable`);
    }
    console.log(`[Gatekeeper] CAO terminal ${terminalId} status: ${status}`);
    return { status, terminalId };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[Gatekeeper] CAO API timeout");
    } else {
      console.error("[Gatekeeper] Error querying CAO API:", err);
    }
    return { status: null, terminalId: null };
  }
}
async function getStatusWithDebounce() {
  const result1 = await getTerminalStatus();
  const status1 = result1.status;
  if (status1 === "processing") {
    console.log("[Gatekeeper] First check: processing, verifying...");
    await sleep(DEBOUNCE_DELAY_MS);
    const result2 = await getTerminalStatus();
    const status2 = result2.status;
    if (status1 === status2) {
      console.log("[Gatekeeper] Status confirmed: processing");
      return "processing";
    } else {
      console.log(`[Gatekeeper] Status changed: ${status1} -> ${status2}`);
      return status2;
    }
  }
  return status1;
}
function isRateLimited(swarmName) {
  try {
    if (!existsSync(RATE_LIMIT_DIR)) {
      mkdirSync(RATE_LIMIT_DIR, { recursive: true });
    }
    const filePath = join(RATE_LIMIT_DIR, `${swarmName}.json`);
    const now = Date.now();
    let timestamps = [];
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, "utf-8"));
        if (Array.isArray(data)) {
          timestamps = data;
        }
      } catch {
        timestamps = [];
      }
    }
    timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= RATE_LIMIT_MAX_ALERTS) {
      console.log(`[Gatekeeper] Rate limited: ${timestamps.length} alerts in last 5 minutes`);
      return true;
    }
    timestamps.push(now);
    writeFileSync(filePath, JSON.stringify(timestamps));
    return false;
  } catch (err) {
    console.error("[Gatekeeper] Rate limit check failed:", err);
    return false;
  }
}
function getRecentOutput() {
  const swarmName = process.env.SWARM_NAME;
  if (!swarmName) {
    return "";
  }
  try {
    const projectDir = `/home/swarm/.claude/projects/-app-worktrees-${swarmName}`;
    const files = execSync(`ls -t ${projectDir}/*.jsonl 2>/dev/null | head -1`, {
      encoding: "utf-8",
      timeout: 5e3
    }).trim();
    if (files) {
      const transcriptText = execSync(
        `grep '"type":"assistant"' "${files}" | tail -3 | jq -r '.message.content[] | select(.type == "text") | .text' 2>/dev/null || true`,
        { encoding: "utf-8", timeout: 5e3 }
      );
      if (transcriptText.trim()) {
        return transcriptText.trim();
      }
    }
    return execSync(
      "tmux capture-pane -t main -p -S -30 2>/dev/null || true",
      { encoding: "utf-8", timeout: 5e3 }
    ).trim();
  } catch {
    return "";
  }
}
async function postToMessageQueue(swarmName, message, status) {
  try {
    let ticketName;
    try {
      const planContent = execSync("head -5 ./PLAN.md 2>/dev/null || true", { encoding: "utf-8" });
      const titleMatch = planContent.match(/^#\s+(.+)/m);
      if (titleMatch) {
        ticketName = titleMatch[1].trim();
      }
    } catch {
    }
    const lines = message.split("\n").filter((l) => l.trim());
    const lastLines = lines.slice(-10).join("\n");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CAO_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(`${STATUSBOARD_URL}/api/swarm-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          swarmName,
          ticketName,
          message: lastLines || `Swarm stopped (status: ${status})`,
          caoStatus: status
        })
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
    console.error("[Gatekeeper] Failed to post to message queue:", err);
  }
}
async function reportHealth(caoAvailable, status) {
  try {
    await fetch(`${STATUSBOARD_URL}/api/gatekeeper-health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caoAvailable,
        caoStatus: status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
  } catch {
  }
}
async function main() {
  const swarmName = process.env.SWARM_NAME;
  if (!swarmName) {
    console.log("[Gatekeeper] Not in swarm container (no SWARM_NAME), exiting");
    process.exit(0);
  }
  const status = await getStatusWithDebounce();
  await reportHealth(status !== null, status);
  if (status === null) {
    console.log("[Gatekeeper] CAO unavailable, checking rate limit before alert");
    if (!isRateLimited(swarmName)) {
      const output2 = getRecentOutput();
      if (output2.length > 20) {
        await postToMessageQueue(swarmName, output2, "unknown");
      }
    }
    process.exit(0);
  }
  if (status === "processing") {
    console.log(`[Gatekeeper] Swarm ${swarmName} is PROCESSING - no alert needed`);
    process.exit(0);
  }
  if (isRateLimited(swarmName)) {
    console.log(`[Gatekeeper] Swarm ${swarmName} rate limited - skipping alert`);
    process.exit(0);
  }
  console.log(`[Gatekeeper] Swarm ${swarmName} status=${status} - posting alert`);
  const output = getRecentOutput();
  await postToMessageQueue(swarmName, output || `Status: ${status}`, status);
  process.exit(0);
}
main().catch((err) => {
  console.error("[Gatekeeper] Error:", err);
  process.exit(0);
});
