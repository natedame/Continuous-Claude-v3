"use strict";
/**
 * Resource State Reader Utility
 *
 * Reads resource state JSON from {tmpdir}/claude-resources-{sessionId}.json.
 * This file is written by status.sh (Phase 3) and contains:
 * - freeMemMB: Available RAM in MB
 * - activeAgents: Number of currently running agents
 * - maxAgents: Maximum agents allowed based on RAM
 * - contextPct: Current context usage percentage
 *
 * Part of Phase 4: TypeScript Resource Reader
 * See: docs/handoffs/resource-limits-plan.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RESOURCE_STATE = void 0;
exports.getSessionId = getSessionId;
exports.getResourceFilePath = getResourceFilePath;
exports.readResourceState = readResourceState;
var fs_1 = require("fs");
var os_1 = require("os");
var path_1 = require("path");
// =============================================================================
// Constants
// =============================================================================
/**
 * Default resource state used when file is missing or corrupt.
 *
 * Values chosen to be conservative:
 * - freeMemMB: 4096 (4GB, reasonable minimum)
 * - activeAgents: 0 (assume none running)
 * - maxAgents: 10 (reasonable default limit)
 * - contextPct: 0 (assume fresh context)
 */
exports.DEFAULT_RESOURCE_STATE = {
    freeMemMB: 4096,
    activeAgents: 0,
    maxAgents: 10,
    contextPct: 0,
};
// =============================================================================
// Functions
// =============================================================================
/**
 * Get the session ID from environment variables.
 *
 * Priority:
 * 1. CLAUDE_SESSION_ID (if set by Claude Code)
 * 2. PPID (parent process ID as fallback)
 *
 * @returns Session ID string
 */
function getSessionId() {
    return process.env.CLAUDE_SESSION_ID || String(process.ppid || process.pid);
}
/**
 * Get the path to the resource state JSON file.
 *
 * @param sessionId - Session ID to use in the filename
 * @returns Path to {tmpdir}/claude-resources-{sessionId}.json
 */
function getResourceFilePath(sessionId) {
    return (0, path_1.join)((0, os_1.tmpdir)(), "claude-resources-".concat(sessionId, ".json"));
}
/**
 * Read resource state from the JSON file.
 *
 * Reads {tmpdir}/claude-resources-{sessionId}.json and parses it into a
 * ResourceState object. Returns null if:
 * - File doesn't exist
 * - File contains invalid JSON
 *
 * Missing fields are filled with defaults from DEFAULT_RESOURCE_STATE.
 *
 * @returns ResourceState object or null if file is missing/corrupt
 *
 * @example
 * ```typescript
 * import { readResourceState } from './shared/resource-reader.js';
 *
 * const state = readResourceState();
 * if (state && state.activeAgents >= state.maxAgents) {
 *   console.log('Agent limit reached!');
 * }
 * ```
 */
function readResourceState() {
    var sessionId = getSessionId();
    var resourceFile = getResourceFilePath(sessionId);
    // Return null if file doesn't exist
    if (!(0, fs_1.existsSync)(resourceFile)) {
        return null;
    }
    try {
        var content = (0, fs_1.readFileSync)(resourceFile, 'utf-8');
        var data = JSON.parse(content);
        // Merge with defaults to handle missing fields
        return {
            freeMemMB: typeof data.freeMemMB === 'number' ? data.freeMemMB : exports.DEFAULT_RESOURCE_STATE.freeMemMB,
            activeAgents: typeof data.activeAgents === 'number' ? data.activeAgents : exports.DEFAULT_RESOURCE_STATE.activeAgents,
            maxAgents: typeof data.maxAgents === 'number' ? data.maxAgents : exports.DEFAULT_RESOURCE_STATE.maxAgents,
            contextPct: typeof data.contextPct === 'number' ? data.contextPct : exports.DEFAULT_RESOURCE_STATE.contextPct,
        };
    }
    catch (_a) {
        // Return null on JSON parse error or file read error
        return null;
    }
}
