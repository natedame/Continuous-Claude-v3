"use strict";
/**
 * PostgreSQL database utilities for Claude Code hooks.
 *
 * Migrated from SQLite (db-utils.ts) to PostgreSQL.
 * Uses coordination_pg.py via Python subprocess for queries.
 *
 * Exports:
 * - getPgConnectionString(): Returns PostgreSQL connection string
 * - runPgQuery(): Executes async Python query via coordination_pg
 * - getActiveAgentCountPg(): Returns count of running agents from PostgreSQL
 * - queryBroadcasts(): Query blackboard messages for swarm coordination
 * - queryPipelineArtifacts(): Query pipeline artifacts for upstream context
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidId = exports.SAFE_ID_PATTERN = void 0;
exports.getPgConnectionString = getPgConnectionString;
exports.runPgQuery = runPgQuery;
exports.queryBroadcasts = queryBroadcasts;
exports.queryPipelineArtifacts = queryPipelineArtifacts;
exports.getActiveAgentCountPg = getActiveAgentCountPg;
exports.registerAgentPg = registerAgentPg;
exports.completeAgentPg = completeAgentPg;
exports.registerSession = registerSession;
exports.getActiveSessions = getActiveSessions;
exports.checkFileClaim = checkFileClaim;
exports.claimFile = claimFile;
exports.broadcastFinding = broadcastFinding;
exports.getRelevantFindings = getRelevantFindings;
var child_process_1 = require("child_process");
var opc_path_js_1 = require("./opc-path.js");
// Re-export SAFE_ID_PATTERN and isValidId from pattern-router for convenience
var pattern_router_js_1 = require("./pattern-router.js");
Object.defineProperty(exports, "SAFE_ID_PATTERN", { enumerable: true, get: function () { return pattern_router_js_1.SAFE_ID_PATTERN; } });
Object.defineProperty(exports, "isValidId", { enumerable: true, get: function () { return pattern_router_js_1.isValidId; } });
/**
 * Get the PostgreSQL connection string.
 *
 * Checks environment variables in priority order:
 * 1. CONTINUOUS_CLAUDE_DB_URL (canonical)
 * 2. DATABASE_URL (backwards compat)
 * 3. OPC_POSTGRES_URL (legacy)
 * 4. Default local development connection
 *
 * @returns PostgreSQL connection string
 */
function getPgConnectionString() {
    return process.env.CONTINUOUS_CLAUDE_DB_URL ||
        process.env.DATABASE_URL ||
        process.env.OPC_POSTGRES_URL ||
        'postgresql://claude:claude_dev@localhost:5432/continuous_claude';
}
/**
 * Execute a PostgreSQL query via coordination_pg.py.
 *
 * Uses spawnSync with uv run to execute async Python code.
 * The Python code receives arguments via sys.argv.
 *
 * @param pythonCode - Python code to execute (receives args via sys.argv)
 * @param args - Arguments passed to Python (sys.argv[1], sys.argv[2], ...)
 * @returns QueryResult with success, stdout, and stderr
 */
function runPgQuery(pythonCode, args) {
    var _a;
    if (args === void 0) { args = []; }
    var opcDir = (0, opc_path_js_1.requireOpcDir)();
    // Wrap the Python code to use asyncio.run() for async queries
    var wrappedCode = "\nimport sys\nimport os\nimport asyncio\nimport json\n\n# Add opc to path for imports\nsys.path.insert(0, '".concat(opcDir, "')\nos.chdir('").concat(opcDir, "')\n\n").concat(pythonCode, "\n");
    try {
        var result = (0, child_process_1.spawnSync)('uv', __spreadArray(['run', 'python', '-c', wrappedCode], args, true), {
            encoding: 'utf-8',
            maxBuffer: 1024 * 1024,
            timeout: 5000, // 5 second timeout - fail gracefully if DB unreachable
            cwd: opcDir,
            env: __assign(__assign({}, process.env), { CONTINUOUS_CLAUDE_DB_URL: getPgConnectionString() }),
        });
        return {
            success: result.status === 0,
            stdout: ((_a = result.stdout) === null || _a === void 0 ? void 0 : _a.trim()) || '',
            stderr: result.stderr || '',
        };
    }
    catch (err) {
        return {
            success: false,
            stdout: '',
            stderr: String(err),
        };
    }
}
/**
 * Query broadcasts/blackboard messages from PostgreSQL.
 *
 * Queries the blackboard table for messages in a swarm that
 * the current agent hasn't read yet.
 *
 * @param swarmId - Swarm identifier
 * @param agentId - Current agent identifier (to exclude from sender)
 * @param limit - Maximum number of messages to return
 * @returns Array of broadcast messages
 */
function queryBroadcasts(swarmId, agentId, limit) {
    if (limit === void 0) { limit = 10; }
    var pythonCode = "\nfrom scripts.agentica_patterns.coordination_pg import CoordinationDBPg\nimport json\n\nswarm_id = sys.argv[1]\nagent_id = sys.argv[2]\nlimit = int(sys.argv[3])\n\nasync def main():\n    async with CoordinationDBPg() as db:\n        # Query blackboard for messages this agent hasn't read\n        messages = await db.read_from_blackboard(swarm_id, agent_id)\n\n        # Limit results\n        messages = messages[:limit]\n\n        # Convert to JSON-serializable format\n        result = []\n        for msg in messages:\n            result.append({\n                'sender': msg.sender_agent,\n                'type': msg.message_type,\n                'payload': msg.payload,\n                'time': msg.created_at.isoformat() if msg.created_at else None\n            })\n\n        print(json.dumps(result))\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [swarmId, agentId, String(limit)]);
    if (!result.success) {
        return { success: false, broadcasts: [] };
    }
    try {
        var broadcasts = JSON.parse(result.stdout || '[]');
        return { success: true, broadcasts: broadcasts };
    }
    catch (_a) {
        return { success: false, broadcasts: [] };
    }
}
/**
 * Query pipeline artifacts from PostgreSQL.
 *
 * Queries the pipeline_artifacts table for artifacts from upstream stages.
 *
 * @param pipelineId - Pipeline identifier
 * @param currentStage - Current stage index (will get artifacts from earlier stages)
 * @returns Array of pipeline artifacts
 */
function queryPipelineArtifacts(pipelineId, currentStage) {
    var pythonCode = "\nimport asyncpg\nimport json\nimport os\n\npipeline_id = sys.argv[1]\ncurrent_stage = int(sys.argv[2])\npg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL') or os.environ.get('DATABASE_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')\n\nasync def main():\n    conn = await asyncpg.connect(pg_url)\n    try:\n        # Query pipeline artifacts from upstream stages\n        rows = await conn.fetch('''\n            SELECT stage_index, artifact_type, artifact_path, artifact_content, created_at\n            FROM pipeline_artifacts\n            WHERE pipeline_id = $1 AND stage_index < $2\n            ORDER BY stage_index ASC, created_at DESC\n        ''', pipeline_id, current_stage)\n\n        artifacts = []\n        for row in rows:\n            artifacts.append({\n                'stage': row['stage_index'],\n                'type': row['artifact_type'],\n                'path': row['artifact_path'],\n                'content': row['artifact_content'],\n                'time': row['created_at'].isoformat() if row['created_at'] else None\n            })\n\n        print(json.dumps(artifacts))\n    finally:\n        await conn.close()\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [pipelineId, String(currentStage)]);
    if (!result.success) {
        return { success: false, artifacts: [] };
    }
    try {
        var artifacts = JSON.parse(result.stdout || '[]');
        return { success: true, artifacts: artifacts };
    }
    catch (_a) {
        return { success: false, artifacts: [] };
    }
}
/**
 * Get count of active (running) agents from PostgreSQL.
 *
 * Queries the agents table for agents with status='running'.
 *
 * @returns Number of running agents, or 0 on any error
 */
function getActiveAgentCountPg() {
    var pythonCode = "\nfrom scripts.agentica_patterns.coordination_pg import CoordinationDBPg\nimport json\n\nasync def main():\n    async with CoordinationDBPg() as db:\n        agents = await db.get_running_agents()\n        print(len(agents))\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode);
    if (!result.success) {
        return 0;
    }
    var count = parseInt(result.stdout, 10);
    return isNaN(count) ? 0 : count;
}
/**
 * Register a new agent in PostgreSQL.
 *
 * @param agentId - Unique agent identifier
 * @param sessionId - Session that spawned the agent
 * @param pattern - Coordination pattern (swarm, hierarchical, etc.)
 * @param pid - Process ID for orphan detection
 * @returns Object with success boolean and any error message
 */
function registerAgentPg(agentId, sessionId, pattern, pid) {
    if (pattern === void 0) { pattern = null; }
    if (pid === void 0) { pid = null; }
    var pythonCode = "\nfrom scripts.agentica_patterns.coordination_pg import CoordinationDBPg\nimport json\n\nagent_id = sys.argv[1]\nsession_id = sys.argv[2]\npattern = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != 'null' else None\npid = int(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != 'null' else None\n\nasync def main():\n    try:\n        async with CoordinationDBPg() as db:\n            await db.register_agent(\n                agent_id=agent_id,\n                session_id=session_id,\n                pattern=pattern,\n                pid=pid\n            )\n        print('ok')\n    except Exception as e:\n        print(f'error: {e}')\n\nasyncio.run(main())\n";
    var args = [
        agentId,
        sessionId,
        pattern || 'null',
        pid !== null ? String(pid) : 'null',
    ];
    var result = runPgQuery(pythonCode, args);
    if (!result.success || result.stdout !== 'ok') {
        return {
            success: false,
            error: result.stderr || result.stdout || 'Unknown error',
        };
    }
    return { success: true };
}
/**
 * Mark an agent as completed in PostgreSQL.
 *
 * @param agentId - Agent identifier to complete
 * @param status - Final status ('completed' or 'failed')
 * @param errorMessage - Optional error message for failed status
 * @returns Object with success boolean and any error message
 */
function completeAgentPg(agentId, status, errorMessage) {
    if (status === void 0) { status = 'completed'; }
    if (errorMessage === void 0) { errorMessage = null; }
    var pythonCode = "\nfrom scripts.agentica_patterns.coordination_pg import CoordinationDBPg\nimport json\n\nagent_id = sys.argv[1]\nstatus = sys.argv[2]\nerror_message = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != 'null' else None\n\nasync def main():\n    try:\n        async with CoordinationDBPg() as db:\n            await db.complete_agent(\n                agent_id=agent_id,\n                status=status,\n                result_summary=error_message\n            )\n        print('ok')\n    except Exception as e:\n        print(f'error: {e}')\n\nasyncio.run(main())\n";
    var args = [
        agentId,
        status,
        errorMessage || 'null',
    ];
    var result = runPgQuery(pythonCode, args);
    if (!result.success || result.stdout !== 'ok') {
        return {
            success: false,
            error: result.stderr || result.stdout || 'Unknown error',
        };
    }
    return { success: true };
}
// =============================================================================
// COORDINATION LAYER: Session Registration
// =============================================================================
/**
 * Register a session in the coordination layer.
 *
 * @param sessionId - Unique session identifier
 * @param project - Project directory path
 * @param workingOn - Description of current task
 * @returns Object with success boolean and any error message
 */
function registerSession(sessionId, project, workingOn) {
    if (workingOn === void 0) { workingOn = ''; }
    var pythonCode = "\nimport asyncpg\nimport os\nfrom datetime import datetime\n\nsession_id = sys.argv[1]\nproject = sys.argv[2]\nworking_on = sys.argv[3] if len(sys.argv) > 3 else ''\npg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL') or os.environ.get('DATABASE_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')\n\nasync def main():\n    conn = await asyncpg.connect(pg_url)\n    try:\n        # Create table if not exists\n        await conn.execute('''\n            CREATE TABLE IF NOT EXISTS sessions (\n                id TEXT PRIMARY KEY,\n                project TEXT NOT NULL,\n                working_on TEXT,\n                started_at TIMESTAMP DEFAULT NOW(),\n                last_heartbeat TIMESTAMP DEFAULT NOW()\n            )\n        ''')\n\n        # Upsert session\n        await conn.execute('''\n            INSERT INTO sessions (id, project, working_on, started_at, last_heartbeat)\n            VALUES ($1, $2, $3, NOW(), NOW())\n            ON CONFLICT (id) DO UPDATE SET\n                working_on = EXCLUDED.working_on,\n                last_heartbeat = NOW()\n        ''', session_id, project, working_on)\n\n        print('ok')\n    finally:\n        await conn.close()\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [sessionId, project, workingOn]);
    if (!result.success || result.stdout !== 'ok') {
        return {
            success: false,
            error: result.stderr || result.stdout || 'Unknown error',
        };
    }
    return { success: true };
}
/**
 * Get active sessions from the coordination layer.
 *
 * @param project - Optional project filter
 * @returns Array of active sessions
 */
function getActiveSessions(project) {
    var pythonCode = "\nimport asyncpg\nimport os\nimport json\nfrom datetime import datetime, timedelta\n\nproject_filter = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != 'null' else None\npg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL') or os.environ.get('DATABASE_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')\n\nasync def main():\n    conn = await asyncpg.connect(pg_url)\n    try:\n        # Get sessions active in last 5 minutes\n        cutoff = datetime.utcnow() - timedelta(minutes=5)\n\n        if project_filter:\n            rows = await conn.fetch('''\n                SELECT id, project, working_on, started_at, last_heartbeat\n                FROM sessions\n                WHERE project = $1 AND last_heartbeat > $2\n                ORDER BY started_at DESC\n            ''', project_filter, cutoff)\n        else:\n            rows = await conn.fetch('''\n                SELECT id, project, working_on, started_at, last_heartbeat\n                FROM sessions\n                WHERE last_heartbeat > $1\n                ORDER BY started_at DESC\n            ''', cutoff)\n\n        sessions = []\n        for row in rows:\n            sessions.append({\n                'id': row['id'],\n                'project': row['project'],\n                'working_on': row['working_on'],\n                'started_at': row['started_at'].isoformat() if row['started_at'] else None,\n                'last_heartbeat': row['last_heartbeat'].isoformat() if row['last_heartbeat'] else None\n            })\n\n        print(json.dumps(sessions))\n    except Exception as e:\n        print(json.dumps([]))\n    finally:\n        await conn.close()\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [project || 'null']);
    if (!result.success) {
        return { success: false, sessions: [] };
    }
    try {
        var sessions = JSON.parse(result.stdout || '[]');
        return { success: true, sessions: sessions };
    }
    catch (_a) {
        return { success: false, sessions: [] };
    }
}
// =============================================================================
// COORDINATION LAYER: File Claims
// =============================================================================
/**
 * Check if a file is claimed by another session.
 *
 * @param filePath - Path to the file
 * @param project - Project directory
 * @param mySessionId - Current session ID
 * @returns Claim info if claimed by another session
 */
function checkFileClaim(filePath, project, mySessionId) {
    var pythonCode = "\nimport asyncpg\nimport os\nimport json\n\nfile_path = sys.argv[1]\nproject = sys.argv[2]\nmy_session_id = sys.argv[3]\npg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL') or os.environ.get('DATABASE_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')\n\nasync def main():\n    conn = await asyncpg.connect(pg_url)\n    try:\n        # Create table if not exists\n        await conn.execute('''\n            CREATE TABLE IF NOT EXISTS file_claims (\n                file_path TEXT,\n                project TEXT,\n                session_id TEXT,\n                claimed_at TIMESTAMP DEFAULT NOW(),\n                PRIMARY KEY (file_path, project)\n            )\n        ''')\n\n        row = await conn.fetchrow('''\n            SELECT session_id, claimed_at FROM file_claims\n            WHERE file_path = $1 AND project = $2 AND session_id != $3\n        ''', file_path, project, my_session_id)\n\n        if row:\n            print(json.dumps({\n                'claimed': True,\n                'claimedBy': row['session_id'],\n                'claimedAt': row['claimed_at'].isoformat() if row['claimed_at'] else None\n            }))\n        else:\n            print(json.dumps({'claimed': False}))\n    finally:\n        await conn.close()\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [filePath, project, mySessionId]);
    if (!result.success) {
        return { claimed: false };
    }
    try {
        return JSON.parse(result.stdout || '{"claimed": false}');
    }
    catch (_a) {
        return { claimed: false };
    }
}
/**
 * Claim a file for the current session.
 *
 * @param filePath - Path to the file
 * @param project - Project directory
 * @param sessionId - Session claiming the file
 */
function claimFile(filePath, project, sessionId) {
    var pythonCode = "\nimport asyncpg\nimport os\n\nfile_path = sys.argv[1]\nproject = sys.argv[2]\nsession_id = sys.argv[3]\npg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL') or os.environ.get('DATABASE_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')\n\nasync def main():\n    conn = await asyncpg.connect(pg_url)\n    try:\n        await conn.execute('''\n            INSERT INTO file_claims (file_path, project, session_id, claimed_at)\n            VALUES ($1, $2, $3, NOW())\n            ON CONFLICT (file_path, project) DO UPDATE SET\n                session_id = EXCLUDED.session_id,\n                claimed_at = NOW()\n        ''', file_path, project, session_id)\n        print('ok')\n    finally:\n        await conn.close()\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [filePath, project, sessionId]);
    return { success: result.success && result.stdout === 'ok' };
}
// =============================================================================
// COORDINATION LAYER: Findings
// =============================================================================
/**
 * Broadcast a finding to the coordination layer.
 *
 * @param sessionId - Session that discovered the finding
 * @param topic - Topic/category of the finding
 * @param finding - The finding content
 * @param relevantTo - Array of files/topics this is relevant to
 */
function broadcastFinding(sessionId, topic, finding, relevantTo) {
    if (relevantTo === void 0) { relevantTo = []; }
    var pythonCode = "\nimport asyncpg\nimport os\nimport json\n\nsession_id = sys.argv[1]\ntopic = sys.argv[2]\nfinding = sys.argv[3]\nrelevant_to = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []\npg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL') or os.environ.get('DATABASE_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')\n\nasync def main():\n    conn = await asyncpg.connect(pg_url)\n    try:\n        # Create table if not exists\n        await conn.execute('''\n            CREATE TABLE IF NOT EXISTS findings (\n                id SERIAL PRIMARY KEY,\n                session_id TEXT NOT NULL,\n                topic TEXT NOT NULL,\n                finding TEXT NOT NULL,\n                relevant_to TEXT[],\n                created_at TIMESTAMP DEFAULT NOW()\n            )\n        ''')\n\n        await conn.execute('''\n            INSERT INTO findings (session_id, topic, finding, relevant_to)\n            VALUES ($1, $2, $3, $4)\n        ''', session_id, topic, finding, relevant_to)\n        print('ok')\n    finally:\n        await conn.close()\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [
        sessionId,
        topic,
        finding,
        JSON.stringify(relevantTo),
    ]);
    return { success: result.success && result.stdout === 'ok' };
}
/**
 * Get relevant findings for a topic or file.
 *
 * @param query - Topic or file path to search for
 * @param excludeSessionId - Session to exclude (usually current session)
 * @param limit - Maximum findings to return
 */
function getRelevantFindings(query, excludeSessionId, limit) {
    if (limit === void 0) { limit = 5; }
    var pythonCode = "\nimport asyncpg\nimport os\nimport json\n\nquery = sys.argv[1]\nexclude_session = sys.argv[2]\nlimit = int(sys.argv[3])\npg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL') or os.environ.get('DATABASE_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')\n\nasync def main():\n    conn = await asyncpg.connect(pg_url)\n    try:\n        # Search by topic match or relevance\n        rows = await conn.fetch('''\n            SELECT session_id, topic, finding, relevant_to, created_at\n            FROM findings\n            WHERE session_id != $1\n              AND (topic ILIKE '%' || $2 || '%'\n                   OR $2 = ANY(relevant_to)\n                   OR finding ILIKE '%' || $2 || '%')\n            ORDER BY created_at DESC\n            LIMIT $3\n        ''', exclude_session, query, limit)\n\n        findings = []\n        for row in rows:\n            findings.append({\n                'session_id': row['session_id'],\n                'topic': row['topic'],\n                'finding': row['finding'],\n                'relevant_to': row['relevant_to'],\n                'created_at': row['created_at'].isoformat() if row['created_at'] else None\n            })\n\n        print(json.dumps(findings))\n    except Exception as e:\n        print(json.dumps([]))\n    finally:\n        await conn.close()\n\nasyncio.run(main())\n";
    var result = runPgQuery(pythonCode, [query, excludeSessionId, String(limit)]);
    if (!result.success) {
        return { success: false, findings: [] };
    }
    try {
        var findings = JSON.parse(result.stdout || '[]');
        return { success: true, findings: findings };
    }
    catch (_a) {
        return { success: false, findings: [] };
    }
}
