"use strict";
/**
 * Memory Client for Skill Lookup
 *
 * TypeScript client that calls the Python memory service via subprocess.
 * Part of the self-improving skill system (Phase 5).
 *
 * Architecture:
 * - Uses spawnSync to call Python memory service
 * - Supports both SQLite and PostgreSQL backends
 * - Returns empty results on connection errors (graceful fallback)
 *
 * Usage:
 *   const client = new MemoryClient({ sessionId: 'abc123' });
 *   const results = client.searchSimilar('find TypeScript hooks');
 *   client.store('User prefers async/await', { type: 'preference' });
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
exports.MemoryClient = void 0;
exports.searchMemory = searchMemory;
exports.storeMemory = storeMemory;
exports.isMemoryAvailable = isMemoryAvailable;
exports.trackUsage = trackUsage;
exports.recordSkillUsage = recordSkillUsage;
var child_process_1 = require("child_process");
/**
 * Memory client that calls Python memory service via subprocess.
 *
 * Provides a TypeScript interface to the 3-layer memory architecture:
 * - PostgreSQL + PGVector for persistence
 * - Embeddings for semantic search
 * - Re-ranking for relevance
 *
 * Falls back gracefully when database is unavailable.
 */
var MemoryClient = /** @class */ (function () {
    function MemoryClient(options) {
        if (options === void 0) { options = {}; }
        this.sessionId = options.sessionId || 'default';
        this.agentId = options.agentId || null;
        this.timeoutMs = options.timeoutMs || 5000;
        this.projectDir = options.projectDir ||
            process.env.CLAUDE_PROJECT_DIR ||
            process.cwd();
    }
    /**
     * Search for similar content in memory.
     *
     * Uses the Python memory service's search functionality.
     * Returns empty array on any error (graceful fallback).
     *
     * @param query - Natural language search query
     * @param limit - Maximum number of results (default: 5)
     * @returns Array of matching results sorted by relevance
     */
    MemoryClient.prototype.searchSimilar = function (query, limit) {
        if (limit === void 0) { limit = 5; }
        if (!query || !query.trim()) {
            return [];
        }
        var pythonScript = this.buildSearchScript();
        var args = [query, String(limit), this.sessionId];
        if (this.agentId) {
            args.push(this.agentId);
        }
        var result = this.runPython(pythonScript, args);
        if (!result.success) {
            // Log error for debugging but don't crash
            if (process.env.DEBUG) {
                console.error('Memory search failed:', result.stderr);
            }
            return [];
        }
        try {
            var parsed = JSON.parse(result.stdout);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.map(this.normalizeResult);
        }
        catch (_a) {
            return [];
        }
    };
    /**
     * Store content in memory.
     *
     * @param content - The content to store
     * @param metadata - Optional metadata to attach
     * @returns Memory ID if successful, null on failure
     */
    MemoryClient.prototype.store = function (content, metadata) {
        if (metadata === void 0) { metadata = {}; }
        if (!content || !content.trim()) {
            return null;
        }
        var pythonScript = this.buildStoreScript();
        var args = [
            content,
            JSON.stringify(metadata),
            this.sessionId,
        ];
        if (this.agentId) {
            args.push(this.agentId);
        }
        var result = this.runPython(pythonScript, args);
        if (!result.success) {
            if (process.env.DEBUG) {
                console.error('Memory store failed:', result.stderr);
            }
            return null;
        }
        try {
            var parsed = JSON.parse(result.stdout);
            return parsed.id || null;
        }
        catch (_a) {
            return null;
        }
    };
    /**
     * Check if memory service is available.
     *
     * @returns true if memory service is reachable
     */
    MemoryClient.prototype.isAvailable = function () {
        var pythonScript = "\nimport json\nimport sys\ntry:\n    from scripts.agentica.memory_factory import get_default_backend\n    backend = get_default_backend()\n    print(json.dumps({\"available\": True, \"backend\": backend}))\nexcept Exception as e:\n    print(json.dumps({\"available\": False, \"error\": str(e)}))\n";
        var result = this.runPython(pythonScript, []);
        if (!result.success) {
            return false;
        }
        try {
            var parsed = JSON.parse(result.stdout);
            return parsed.available === true;
        }
        catch (_a) {
            return false;
        }
    };
    /**
     * Build Python script for memory search.
     */
    MemoryClient.prototype.buildSearchScript = function () {
        return "\nimport json\nimport sys\nimport asyncio\nimport os\n\n# Add project to path for imports\nproject_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())\nsys.path.insert(0, project_dir)\n\nasync def search():\n    query = sys.argv[1]\n    limit = int(sys.argv[2])\n    session_id = sys.argv[3]\n    agent_id = sys.argv[4] if len(sys.argv) > 4 else None\n\n    try:\n        from scripts.agentica.memory_factory import create_default_memory_service\n        memory = create_default_memory_service(session_id)\n\n        await memory.connect()\n\n        # Try vector search first, fall back to text search\n        results = await memory.search(query, limit=limit)\n\n        await memory.close()\n\n        # Convert to JSON-safe format with normalized field names\n        safe_results = []\n        for r in results:\n            safe_results.append({\n                \"content\": r.get(\"content\", \"\"),\n                # Use similarity if available, otherwise rank (BM25)\n                \"similarity\": float(r.get(\"similarity\", r.get(\"rank\", 0.0))),\n                \"metadata\": r.get(\"metadata\", {})\n            })\n\n        print(json.dumps(safe_results))\n    except Exception as e:\n        # Return empty array on error - graceful fallback\n        print(json.dumps([]))\n        sys.exit(0)  # Exit 0 to avoid breaking the hook\n\nasyncio.run(search())\n";
    };
    /**
     * Build Python script for memory store.
     */
    MemoryClient.prototype.buildStoreScript = function () {
        return "\nimport json\nimport sys\nimport asyncio\nimport os\n\n# Add project to path for imports\nproject_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())\nsys.path.insert(0, project_dir)\n\nasync def store():\n    content = sys.argv[1]\n    metadata = json.loads(sys.argv[2])\n    session_id = sys.argv[3]\n    agent_id = sys.argv[4] if len(sys.argv) > 4 else None\n\n    try:\n        from scripts.agentica.memory_factory import create_default_memory_service\n        memory = create_default_memory_service(session_id)\n\n        await memory.connect()\n\n        memory_id = await memory.store(content, metadata=metadata)\n\n        await memory.close()\n\n        print(json.dumps({\"id\": memory_id}))\n    except Exception as e:\n        print(json.dumps({\"error\": str(e)}))\n        sys.exit(1)\n\nasyncio.run(store())\n";
    };
    /**
     * Execute Python script via subprocess.
     */
    MemoryClient.prototype.runPython = function (script, args) {
        var _a;
        try {
            var result = (0, child_process_1.spawnSync)('python3', __spreadArray(['-c', script], args, true), {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024,
                timeout: this.timeoutMs,
                cwd: this.projectDir,
                env: __assign(__assign({}, process.env), { CLAUDE_PROJECT_DIR: this.projectDir }),
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
    };
    /**
     * Normalize a search result to the standard interface.
     */
    MemoryClient.prototype.normalizeResult = function (raw) {
        return {
            content: String(raw.content || ''),
            similarity: typeof raw.similarity === 'number' ? raw.similarity : 0,
            metadata: raw.metadata || {},
        };
    };
    return MemoryClient;
}());
exports.MemoryClient = MemoryClient;
/**
 * Convenience function to search memory.
 *
 * Creates a temporary client and performs a search.
 *
 * @param query - Search query
 * @param limit - Maximum results
 * @param options - Client options
 * @returns Array of matching results
 */
function searchMemory(query, limit, options) {
    if (limit === void 0) { limit = 5; }
    if (options === void 0) { options = {}; }
    var client = new MemoryClient(options);
    return client.searchSimilar(query, limit);
}
/**
 * Convenience function to store in memory.
 *
 * Creates a temporary client and stores content.
 *
 * @param content - Content to store
 * @param metadata - Metadata to attach
 * @param options - Client options
 * @returns Memory ID or null on failure
 */
function storeMemory(content, metadata, options) {
    if (metadata === void 0) { metadata = {}; }
    if (options === void 0) { options = {}; }
    var client = new MemoryClient(options);
    return client.store(content, metadata);
}
/**
 * Check if memory service is available.
 *
 * @param options - Client options
 * @returns true if available
 */
function isMemoryAvailable(options) {
    if (options === void 0) { options = {}; }
    var client = new MemoryClient(options);
    return client.isAvailable();
}
/**
 * Track usage of a skill or memory match.
 *
 * Per plan Phase 18:
 * - Track that this pattern worked
 * - Boost its relevance for future searches
 * - Store decision trace
 *
 * Stores a usage record in memory for future learning.
 *
 * @param record - Usage record to store
 * @param options - Client options
 * @returns Memory ID if successful, null on failure
 */
function trackUsage(record, options) {
    if (options === void 0) { options = {}; }
    var content = "Skill usage: ".concat(record.skillName || 'unknown', " via ").concat(record.source, " (confidence: ").concat(record.confidence.toFixed(2), ")");
    var metadata = {
        type: 'skill_usage',
        usageType: record.type,
        skillName: record.skillName,
        source: record.source,
        confidence: record.confidence,
        timestamp: record.timestamp,
        sessionId: record.sessionId,
    };
    return storeMemory(content, metadata, options);
}
/**
 * Record that a skill match was used successfully.
 *
 * Convenience function that creates a usage record for a skill match.
 * This helps boost the skill's relevance for future searches.
 *
 * @param skillName - Name of the matched skill
 * @param source - How the skill was matched (keyword/intent/memory)
 * @param confidence - Confidence score of the match
 * @param sessionId - Current session ID
 * @param options - Client options
 * @returns Memory ID if successful, null on failure
 */
function recordSkillUsage(skillName, source, confidence, sessionId, options) {
    if (options === void 0) { options = {}; }
    var record = {
        type: 'skill_match',
        skillName: skillName,
        source: source,
        confidence: confidence,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
    };
    return trackUsage(record, options);
}
