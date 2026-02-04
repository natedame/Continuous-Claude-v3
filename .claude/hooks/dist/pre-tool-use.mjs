#!/usr/bin/env node

// src/pre-tool-use.ts
import { readFileSync as readFileSync2, existsSync as existsSync7 } from "fs";

// src/shared/pattern-router.ts
function detectPattern() {
  const pattern = process.env.PATTERN_TYPE;
  if (!pattern) return null;
  return pattern;
}
var SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
function isValidId(id) {
  return SAFE_ID_PATTERN.test(id);
}

// src/shared/db-utils.ts
import { spawnSync } from "child_process";
import { join } from "path";
function getDbPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return join(
    projectDir,
    ".claude",
    "cache",
    "agentica-coordination",
    "coordination.db"
  );
}
function runPythonQuery(script, args) {
  try {
    const result = spawnSync("python3", ["-c", script, ...args], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024
    });
    return {
      success: result.status === 0,
      stdout: result.stdout?.trim() || "",
      stderr: result.stderr || ""
    };
  } catch (err) {
    return {
      success: false,
      stdout: "",
      stderr: String(err)
    };
  }
}

// src/shared/resource-reader.ts
import { readFileSync, existsSync } from "fs";
var DEFAULT_RESOURCE_STATE = {
  freeMemMB: 4096,
  activeAgents: 0,
  maxAgents: 10,
  contextPct: 0
};
function getSessionId() {
  return process.env.CLAUDE_SESSION_ID || String(process.ppid || process.pid);
}
function getResourceFilePath(sessionId) {
  return `/tmp/claude-resources-${sessionId}.json`;
}
function readResourceState() {
  const sessionId = getSessionId();
  const resourceFile = getResourceFilePath(sessionId);
  if (!existsSync(resourceFile)) {
    return null;
  }
  try {
    const content = readFileSync(resourceFile, "utf-8");
    const data = JSON.parse(content);
    return {
      freeMemMB: typeof data.freeMemMB === "number" ? data.freeMemMB : DEFAULT_RESOURCE_STATE.freeMemMB,
      activeAgents: typeof data.activeAgents === "number" ? data.activeAgents : DEFAULT_RESOURCE_STATE.activeAgents,
      maxAgents: typeof data.maxAgents === "number" ? data.maxAgents : DEFAULT_RESOURCE_STATE.maxAgents,
      contextPct: typeof data.contextPct === "number" ? data.contextPct : DEFAULT_RESOURCE_STATE.contextPct
    };
  } catch {
    return null;
  }
}

// src/patterns/swarm.ts
import { existsSync as existsSync2 } from "fs";
async function onPreToolUse(input) {
  const swarmId = process.env.SWARM_ID;
  if (!swarmId) {
    return { result: "continue" };
  }
  if (!isValidId(swarmId)) {
    return { result: "continue" };
  }
  const agentId = process.env.AGENT_ID || "unknown";
  if (agentId !== "unknown" && !isValidId(agentId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync2(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
swarm_id = sys.argv[2]
agent_id = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")
conn.row_factory = sqlite3.Row
cursor = conn.execute('''
    SELECT sender_agent, broadcast_type, payload, created_at
    FROM broadcasts
    WHERE swarm_id = ? AND sender_agent != ?
    ORDER BY created_at DESC
    LIMIT 10
''', (swarm_id, agent_id))

broadcasts = []
for row in cursor.fetchall():
    broadcasts.append({
        'sender': row['sender_agent'],
        'type': row['broadcast_type'],
        'payload': json.loads(row['payload']),
        'time': row['created_at']
    })

print(json.dumps(broadcasts))
`;
    const result = runPythonQuery(query, [dbPath, swarmId, agentId]);
    if (!result.success) {
      return { result: "continue" };
    }
    const broadcasts = JSON.parse(result.stdout || "[]");
    if (broadcasts.length > 0) {
      let contextMessage = "\n--- SWARM BROADCASTS ---\n";
      for (const b of broadcasts) {
        contextMessage += `[${b.type.toUpperCase()}] from ${b.sender}:
`;
        contextMessage += `  ${JSON.stringify(b.payload)}
`;
      }
      contextMessage += "------------------------\n";
      return {
        result: "continue",
        message: contextMessage
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Broadcast query error:", err);
    return { result: "continue" };
  }
}

// src/patterns/jury.ts
async function onPreToolUse2(input) {
  const juryId = process.env.JURY_ID;
  if (!juryId) {
    return { result: "continue" };
  }
  if (!isValidId(juryId)) {
    return { result: "continue" };
  }
  const isolation = process.env.JURY_ISOLATION;
  if (isolation !== "strict") {
    return { result: "continue" };
  }
  const toolName = input.tool_name;
  if (toolName === "Read") {
    return {
      result: "block",
      message: "JURY ISOLATION: Read tool is blocked in strict isolation mode to prevent cross-juror contamination. Vote based on your independent analysis."
    };
  }
  return { result: "continue" };
}

// src/patterns/hierarchical.ts
async function onPreToolUse3(input) {
  const hierarchyId = process.env.HIERARCHY_ID;
  if (!hierarchyId) {
    return { result: "continue" };
  }
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  return { result: "continue" };
}

// src/patterns/generator-critic.ts
import { existsSync as existsSync3 } from "fs";
async function onPreToolUse4(input) {
  const gcId = process.env.GC_ID;
  if (!gcId) {
    return { result: "continue" };
  }
  if (!isValidId(gcId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "unknown";
  const iteration = parseInt(process.env.GC_ITERATION || "1", 10);
  const dbPath = getDbPath();
  if (role !== "generator" || iteration <= 1) {
    return { result: "continue" };
  }
  if (!existsSync3(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
gc_id = sys.argv[2]
prev_iteration = int(sys.argv[3])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get previous iteration's feedback
cursor = conn.execute('''
    SELECT critic_feedback
    FROM gc_iterations
    WHERE gc_id = ? AND iteration = ?
''', (gc_id, prev_iteration))

row = cursor.fetchone()
feedback = row[0] if row else None

conn.close()
print(json.dumps({'feedback': feedback}))
`;
    const prevIteration = iteration - 1;
    const result = runPythonQuery(query, [dbPath, gcId, prevIteration.toString()]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.feedback && data.feedback !== "(feedback recorded)") {
      return {
        result: "continue",
        message: `CRITIC FEEDBACK from iteration ${prevIteration}: ${data.feedback}`
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("PreToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/blackboard.ts
import { existsSync as existsSync4 } from "fs";
async function onPreToolUse5(input) {
  const blackboardId = process.env.BLACKBOARD_ID;
  if (!blackboardId) {
    return { result: "continue" };
  }
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "specialist";
  if (role !== "specialist") {
    return { result: "continue" };
  }
  const readsFrom = process.env.BLACKBOARD_READS_FROM || "";
  if (!readsFrom) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync4(dbPath)) {
    return { result: "continue" };
  }
  try {
    const keys = readsFrom.split(",").map((k) => k.trim()).filter((k) => k);
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
blackboard_id = sys.argv[2]
keys_json = sys.argv[3]

keys = json.loads(keys_json)

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Fetch state for requested keys
state = {}
for key in keys:
    cursor = conn.execute('''
        SELECT value, updated_by
        FROM blackboard_state
        WHERE blackboard_id = ? AND key = ?
    ''', (blackboard_id, key))
    row = cursor.fetchone()
    if row:
        state[key] = {'value': row[0], 'updated_by': row[1]}

conn.close()
print(json.dumps(state))
`;
    const result = runPythonQuery(query, [dbPath, blackboardId, JSON.stringify(keys)]);
    if (!result.success) {
      console.error("PreToolUse Python error:", result.stderr);
      return { result: "continue" };
    }
    let state;
    try {
      state = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (Object.keys(state).length === 0) {
      return { result: "continue" };
    }
    let message = "CURRENT BLACKBOARD STATE:\n\n";
    for (const [key, data] of Object.entries(state)) {
      message += `${key}: ${data.value}
`;
      message += `  (contributed by: ${data.updated_by})

`;
    }
    return {
      result: "continue",
      message
    };
  } catch (err) {
    console.error("PreToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/map-reduce.ts
async function onPreToolUse6(input) {
  return { result: "continue" };
}

// src/patterns/chain-of-responsibility.ts
async function onPreToolUse7(input) {
  const corId = process.env.COR_ID;
  if (!corId) {
    return { result: "continue" };
  }
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const handlerPriority = process.env.HANDLER_PRIORITY || "0";
  const chainLength = process.env.CHAIN_LENGTH || "1";
  return { result: "continue" };
}

// src/patterns/event-driven.ts
import { existsSync as existsSync5 } from "fs";
async function onPreToolUse8(input) {
  const busId = process.env.EVENT_BUS_ID;
  if (!busId) {
    return { result: "continue" };
  }
  if (!isValidId(busId)) {
    return { result: "continue" };
  }
  const agentRole = process.env.AGENT_ROLE;
  if (agentRole !== "subscriber") {
    return { result: "continue" };
  }
  const eventTypesJson = process.env.SUBSCRIBER_EVENT_TYPES;
  if (!eventTypesJson) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync5(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
bus_id = sys.argv[2]
event_types_json = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Parse event types
event_types = json.loads(event_types_json)

# Build query for matching events
if '*' in event_types:
    # Wildcard: get all events
    cursor = conn.execute('''
        SELECT event_type, payload, published_by, created_at
        FROM event_queue
        WHERE bus_id = ?
        ORDER BY created_at ASC
        LIMIT 10
    ''', (bus_id,))
else:
    # Specific types: filter by event_type
    placeholders = ','.join(['?'] * len(event_types))
    query = f'''
        SELECT event_type, payload, published_by, created_at
        FROM event_queue
        WHERE bus_id = ? AND event_type IN ({placeholders})
        ORDER BY created_at ASC
        LIMIT 10
    '''
    cursor = conn.execute(query, [bus_id] + event_types)

events = []
for row in cursor.fetchall():
    events.append({
        'type': row[0],
        'payload': json.loads(row[1]) if row[1] else {},
        'published_by': row[2],
        'created_at': row[3]
    })

conn.close()
print(json.dumps({'events': events, 'count': len(events)}))
`;
    const result = runPythonQuery(query, [dbPath, busId, eventTypesJson]);
    if (!result.success) {
      console.error("PreToolUse Python error:", result.stderr);
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.count === 0) {
      return { result: "continue" };
    }
    let message = `PENDING EVENTS (${data.count} total):

`;
    for (const evt of data.events) {
      message += `Event: ${evt.type}
`;
      message += `Payload: ${JSON.stringify(evt.payload)}
`;
      message += `Published by: ${evt.published_by}
`;
      message += `Time: ${evt.created_at}

`;
    }
    message += "Process these events according to your subscription.";
    return {
      result: "continue",
      message
    };
  } catch (err) {
    console.error("PreToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/adversarial.ts
import { existsSync as existsSync6 } from "fs";
async function onPreToolUse9(input) {
  const advId = process.env.ADV_ID;
  if (!advId) {
    return { result: "continue" };
  }
  if (!isValidId(advId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "unknown";
  const round = parseInt(process.env.ADVERSARIAL_ROUND || "1", 10);
  const dbPath = getDbPath();
  if (role !== "advocate" && role !== "adversary") {
    return { result: "continue" };
  }
  if (round <= 1 || !existsSync6(dbPath)) {
    return { result: "continue" };
  }
  try {
    const opponentRole = role === "advocate" ? "adversary" : "advocate";
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
adv_id = sys.argv[2]
prev_round = sys.argv[3]
opponent_role = sys.argv[4]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get opponent's argument from previous round
cursor = conn.execute('''
    SELECT ${opponentRole === "advocate" ? "advocate_argument" : "adversary_argument"}
    FROM adversarial_rounds
    WHERE adv_id = ? AND round = ?
''', (adv_id, prev_round))

row = cursor.fetchone()
opponent_arg = row[0] if row and row[0] else None

conn.close()
print(json.dumps({'opponent_argument': opponent_arg}))
`;
    const result = runPythonQuery(query, [dbPath, advId, (round - 1).toString(), opponentRole]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.opponent_argument) {
      return {
        result: "continue",
        message: `OPPONENT'S LAST ARGUMENT:
${data.opponent_argument}

Consider this when forming your response.`
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("PreToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/pre-tool-use.ts
async function handleSwarm(input) {
  return onPreToolUse(input);
}
async function handleJury(input) {
  return onPreToolUse2(input);
}
async function handlePipeline(input) {
  const pipelineId = process.env.PATTERN_ID;
  const stageIndex = process.env.PIPELINE_STAGE_INDEX;
  if (!pipelineId || !isValidId(pipelineId)) {
    return { result: "continue" };
  }
  const currentStage = parseInt(stageIndex || "0", 10);
  if (currentStage === 0) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync7(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
pipeline_id = sys.argv[2]
current_stage = int(sys.argv[3])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")
conn.row_factory = sqlite3.Row

# Get all artifacts from upstream stages
cursor = conn.execute('''
    SELECT stage_index, artifact_type, artifact_path, artifact_content, created_at
    FROM pipeline_artifacts
    WHERE pipeline_id = ? AND stage_index < ?
    ORDER BY stage_index ASC, created_at DESC
''', (pipeline_id, current_stage))

artifacts = []
for row in cursor.fetchall():
    artifacts.append({
        'stage': row['stage_index'],
        'type': row['artifact_type'],
        'path': row['artifact_path'],
        'content': row['artifact_content'],
        'time': row['created_at']
    })

print(json.dumps(artifacts))
`;
    const result = runPythonQuery(query, [dbPath, pipelineId, String(currentStage)]);
    if (!result.success) {
      return { result: "continue" };
    }
    const artifacts = JSON.parse(result.stdout || "[]");
    if (artifacts.length > 0) {
      let contextMessage = "\n--- UPSTREAM PIPELINE ARTIFACTS ---\n";
      for (const a of artifacts) {
        contextMessage += `[Stage ${a.stage}] ${a.type}:
`;
        if (a.path) {
          contextMessage += `  Path: ${a.path}
`;
        }
        if (a.content) {
          try {
            const parsed = JSON.parse(a.content);
            contextMessage += `  Content: ${JSON.stringify(parsed)}
`;
          } catch {
            contextMessage += `  Content: ${a.content}
`;
          }
        }
      }
      contextMessage += "-----------------------------------\n";
      return {
        result: "continue",
        message: contextMessage
      };
    }
    return { result: "continue" };
  } catch (err) {
    return { result: "continue" };
  }
}
async function handleCircuitBreaker(input) {
  return { result: "continue" };
}

// Metrics logging - fire-and-forget to statusboard
// Use localhost on host Mac, host.docker.internal in Docker containers
var STATUSBOARD_URL = existsSync7('/.dockerenv')
  ? 'http://host.docker.internal:3010'
  : 'http://localhost:3010';

function logResourceEvent(eventType, data) {
  // Fire-and-forget: don't block operations if statusboard is down
  try {
    const swarmName = process.env.SWARM_NAME || 'unknown';
    const sessionId = getSessionId();

    const payload = JSON.stringify({
      event: eventType,
      swarm_name: swarmName,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      ...data
    });

    // Use spawn to avoid blocking - truly fire-and-forget
    const { spawn } = require('child_process');
    const curl = spawn('curl', [
      '-s', '-o', '/dev/null',
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-d', payload,
      '--connect-timeout', '1',
      '--max-time', '2',
      `${STATUSBOARD_URL}/api/metrics/resource-events`
    ], { detached: true, stdio: 'ignore' });
    curl.unref(); // Don't wait for completion
  } catch {
    // Silently fail - metrics are nice-to-have
  }
}

function logSpawnEvent(toolName, agentCount, maxAgents) {
  logResourceEvent('spawn', {
    tool_name: toolName,
    agent_count: agentCount,
    max_agents: maxAgents
  });
}

function logBlockEvent(reason, toolName, threshold) {
  logResourceEvent('block', {
    reason: reason,
    tool_name: toolName,
    threshold: threshold
  });
}

function logWarningEvent(metric, threshold, currentValue) {
  logResourceEvent('warning', {
    metric: metric,
    threshold: threshold,
    current_value: currentValue
  });
}

// Memory pressure monitoring
var MEMORY_THRESHOLDS = {
  warn70: 70,
  warn80: 80,
  block90: 90
};
var MEMORY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between same-level warnings

function getMemoryUsagePercent() {
  try {
    // Try cgroup v2 first (Docker containers)
    const cgroupPath = '/sys/fs/cgroup/memory.current';
    const cgroupLimitPath = '/sys/fs/cgroup/memory.max';
    if (existsSync7(cgroupPath) && existsSync7(cgroupLimitPath)) {
      const current = parseInt(readFileSync2(cgroupPath, 'utf-8').trim(), 10);
      const limitStr = readFileSync2(cgroupLimitPath, 'utf-8').trim();
      if (limitStr !== 'max') {
        const limit = parseInt(limitStr, 10);
        // Guard against NaN from parseInt
        if (limit > 0 && !isNaN(current)) {
          const percent = Math.round((current / limit) * 100);
          if (!isNaN(percent)) return percent;
        }
      }
    }

    // Try cgroup v1 (older Docker)
    const cgroupV1Path = '/sys/fs/cgroup/memory/memory.usage_in_bytes';
    const cgroupV1LimitPath = '/sys/fs/cgroup/memory/memory.limit_in_bytes';
    if (existsSync7(cgroupV1Path) && existsSync7(cgroupV1LimitPath)) {
      const current = parseInt(readFileSync2(cgroupV1Path, 'utf-8').trim(), 10);
      const limit = parseInt(readFileSync2(cgroupV1LimitPath, 'utf-8').trim(), 10);
      // Ignore if limit is set to a very high value (effectively no limit)
      // Guard against NaN from parseInt
      if (limit > 0 && limit < 9223372036854771712 && !isNaN(current)) {
        const percent = Math.round((current / limit) * 100);
        if (!isNaN(percent)) return percent;
      }
    }

    // Fall back to /proc/meminfo (host or when cgroup not available)
    if (existsSync7('/proc/meminfo')) {
      const meminfo = readFileSync2('/proc/meminfo', 'utf-8');
      const totalMatch = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
      const availableMatch = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);
      if (totalMatch && availableMatch) {
        const total = parseInt(totalMatch[1], 10);
        const available = parseInt(availableMatch[1], 10);
        // Guard against NaN
        if (!isNaN(total) && !isNaN(available) && total > 0) {
          const used = total - available;
          const percent = Math.round((used / total) * 100);
          if (!isNaN(percent)) return percent;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getMemoryCooldownPath() {
  const sessionId = getSessionId();
  return `/tmp/claude-memory-cooldown-${sessionId}.json`;
}

function checkMemoryCooldown(threshold) {
  try {
    const cooldownPath = getMemoryCooldownPath();
    if (!existsSync7(cooldownPath)) {
      return { shouldWarn: true, lastWarned: null };
    }
    const data = JSON.parse(readFileSync2(cooldownPath, 'utf-8'));
    const lastWarnedAt = data[`threshold_${threshold}`] || 0;
    const now = Date.now();
    if (now - lastWarnedAt > MEMORY_COOLDOWN_MS) {
      return { shouldWarn: true, lastWarned: lastWarnedAt };
    }
    return { shouldWarn: false, lastWarned: lastWarnedAt };
  } catch {
    return { shouldWarn: true, lastWarned: null };
  }
}

function updateMemoryCooldown(threshold) {
  try {
    const cooldownPath = getMemoryCooldownPath();
    let data = {};
    if (existsSync7(cooldownPath)) {
      try {
        data = JSON.parse(readFileSync2(cooldownPath, 'utf-8'));
      } catch { data = {}; }
    }
    data[`threshold_${threshold}`] = Date.now();
    require('fs').writeFileSync(cooldownPath, JSON.stringify(data));
  } catch {
    // Silently fail - cooldown is nice-to-have
  }
}

function resetMemoryCooldownIfRecovered(currentPercent) {
  // If memory dropped below 65%, reset the 70% warning cooldown
  // so it can fire again if memory rises back up
  try {
    const cooldownPath = getMemoryCooldownPath();
    if (!existsSync7(cooldownPath)) return;

    const data = JSON.parse(readFileSync2(cooldownPath, 'utf-8'));
    let changed = false;

    if (currentPercent < 65 && data.threshold_70) {
      delete data.threshold_70;
      changed = true;
    }
    if (currentPercent < 75 && data.threshold_80) {
      delete data.threshold_80;
      changed = true;
    }
    if (currentPercent < 85 && data.threshold_90) {
      delete data.threshold_90;
      changed = true;
    }

    if (changed) {
      require('fs').writeFileSync(cooldownPath, JSON.stringify(data));
    }
  } catch {
    // Silently fail
  }
}

function checkMemoryPressure(toolName) {
  const memPercent = getMemoryUsagePercent();
  if (memPercent === null) {
    return null; // Can't determine memory, allow operation
  }

  // Reset cooldowns if memory recovered
  resetMemoryCooldownIfRecovered(memPercent);

  // Use same SPAWN_TOOLS list as main function (consistent)
  const BASE_SPAWN_TOOLS = ["Task", "mcp__cao-mcp-server__assign", "mcp__cao-mcp-server__handoff"];
  const extraTools = (process.env.SWARM_SPAWN_TOOLS || '').split(',').filter(t => t.trim());
  const SPAWN_TOOLS = [...BASE_SPAWN_TOOLS, ...extraTools];
  const isSpawnTool = SPAWN_TOOLS.includes(toolName);

  // 90% - Block spawn tools only
  if (memPercent >= MEMORY_THRESHOLDS.block90) {
    if (isSpawnTool) {
      return {
        action: "block",
        threshold: 90,
        currentValue: memPercent,
        message: `Memory critical (${memPercent}%). Cannot spawn new agents. Complete current work or wait for memory to free up.`
      };
    }
    // Non-spawn tools get a warning at 90%
    const cooldown = checkMemoryCooldown(90);
    if (cooldown.shouldWarn) {
      updateMemoryCooldown(90);
      return {
        action: "warn",
        threshold: 90,
        currentValue: memPercent,
        message: `⚠️ Memory critical (${memPercent}%). Agent spawning disabled. Finish current tasks to free memory.`
      };
    }
    return null;
  }

  // 80% - Warn only (once per cooldown)
  if (memPercent >= MEMORY_THRESHOLDS.warn80) {
    const cooldown = checkMemoryCooldown(80);
    if (cooldown.shouldWarn) {
      updateMemoryCooldown(80);
      return {
        action: "warn",
        threshold: 80,
        currentValue: memPercent,
        message: `⚠️ Memory high (${memPercent}%). Consider completing current tasks before spawning more agents.`
      };
    }
    return null;
  }

  // 70% - Warn only (once per cooldown)
  if (memPercent >= MEMORY_THRESHOLDS.warn70) {
    const cooldown = checkMemoryCooldown(70);
    if (cooldown.shouldWarn) {
      updateMemoryCooldown(70);
      return {
        action: "warn",
        threshold: 70,
        currentValue: memPercent,
        message: `ℹ️ Memory at ${memPercent}%. Monitoring resource usage.`
      };
    }
    return null;
  }

  return null;
}
async function main() {
  let input;
  try {
    const rawInput = readFileSync2(0, "utf-8");
    input = JSON.parse(rawInput);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Agent spawn limit enforcement - applies to all tools that create new agents
  // handoff also creates agents (creates terminal before blocking wait)
  // SWARM_SPAWN_TOOLS env var can add additional tools (comma-separated)
  const BASE_SPAWN_TOOLS = ["Task", "mcp__cao-mcp-server__assign", "mcp__cao-mcp-server__handoff"];
  const extraTools = (process.env.SWARM_SPAWN_TOOLS || '').split(',').filter(t => t.trim());
  const SPAWN_TOOLS = [...BASE_SPAWN_TOOLS, ...extraTools];
  if (SPAWN_TOOLS.includes(input.tool_name)) {
    const resourceState = readResourceState();
    if (resourceState && resourceState.activeAgents >= resourceState.maxAgents) {
      // Log the block event
      logBlockEvent('agent_limit', input.tool_name, `${resourceState.activeAgents}/${resourceState.maxAgents}`);
      console.log(JSON.stringify({
        result: "block",
        reason: `Agent limit reached: ${resourceState.activeAgents}/${resourceState.maxAgents} agents running. Wait for existing agents to complete or use send_message to check status.`
      }));
      return;
    }
    // Log successful spawn (will be counted when agent actually starts)
    logSpawnEvent(input.tool_name, resourceState?.activeAgents || 0, resourceState?.maxAgents || 10);
  }

  // Memory pressure layer - warn at 70%/80%, block spawns at 90%
  const memoryCheck = checkMemoryPressure(input.tool_name);
  if (memoryCheck) {
    if (memoryCheck.action === "block") {
      // Log the block event
      logBlockEvent('memory', input.tool_name, memoryCheck.threshold || '90%');
      console.log(JSON.stringify({
        result: "block",
        reason: memoryCheck.message
      }));
      return;
    }
    if (memoryCheck.action === "warn") {
      // Log the warning event
      logWarningEvent('memory', memoryCheck.threshold, memoryCheck.currentValue);
      // For warnings, continue but include the message
      console.log(JSON.stringify({
        result: "continue",
        message: memoryCheck.message
      }));
      return;
    }
  }

  const patternType = detectPattern();
  if (!patternType) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  let output;
  try {
    switch (patternType) {
      case "swarm":
        output = await handleSwarm(input);
        break;
      case "jury":
        output = await handleJury(input);
        break;
      case "pipeline":
        output = await handlePipeline(input);
        break;
      case "generator_critic":
        output = await onPreToolUse4(input);
        break;
      case "hierarchical":
        output = await onPreToolUse3(input);
        break;
      case "map_reduce":
        output = await onPreToolUse6(input);
        break;
      case "blackboard":
        output = await onPreToolUse5(input);
        break;
      case "circuit_breaker":
        output = await handleCircuitBreaker(input);
        break;
      case "chain_of_responsibility":
        output = await onPreToolUse7(input);
        break;
      case "adversarial":
        output = await onPreToolUse9(input);
        break;
      case "event_driven":
        output = await onPreToolUse8(input);
        break;
      default:
        output = { result: "continue" };
    }
  } catch (err) {
    output = { result: "continue" };
  }
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
