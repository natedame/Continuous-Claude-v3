"use strict";
/**
 * Session ID utilities for cross-process coordination.
 *
 * Provides consistent session ID generation and persistence across hooks.
 * Session IDs are persisted to ~/.claude/.coordination-session-id to enable
 * cross-process sharing (each hook runs as a separate Node.js process).
 *
 * Used by:
 * - session-register.ts (writes ID on session start)
 * - file-claims.ts (reads ID for file conflict detection)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionIdFile = getSessionIdFile;
exports.generateSessionId = generateSessionId;
exports.writeSessionId = writeSessionId;
exports.readSessionId = readSessionId;
exports.getSessionId = getSessionId;
exports.getProject = getProject;
var fs_1 = require("fs");
var path_1 = require("path");
/** Default filename for session ID persistence */
var SESSION_ID_FILENAME = '.coordination-session-id';
/**
 * Returns the path to the session ID persistence file.
 * Optionally creates the parent directory if it doesn't exist.
 *
 * @param options.createDir - If true, creates ~/.claude/ directory (default: false)
 * @returns Path to ~/.claude/.coordination-session-id
 */
function getSessionIdFile(options) {
    if (options === void 0) { options = {}; }
    var claudeDir = (0, path_1.join)(process.env.HOME || '/tmp', '.claude');
    if (options.createDir) {
        try {
            (0, fs_1.mkdirSync)(claudeDir, { recursive: true, mode: 448 });
        }
        catch ( /* ignore mkdir errors */_a) { /* ignore mkdir errors */ }
    }
    return (0, path_1.join)(claudeDir, SESSION_ID_FILENAME);
}
/**
 * Generates a new short session ID.
 * Priority: BRAINTRUST_SPAN_ID (first 8 chars) > timestamp-based ID.
 *
 * @returns 8-character session identifier (e.g., "s-m1abc23")
 */
function generateSessionId() {
    var spanId = process.env.BRAINTRUST_SPAN_ID;
    if (spanId) {
        return spanId.slice(0, 8);
    }
    return "s-".concat(Date.now().toString(36));
}
/**
 * Writes the session ID to the persistence file.
 * Creates the ~/.claude/ directory if needed.
 *
 * @param sessionId - The session ID to persist
 * @returns true if write succeeded, false otherwise
 */
function writeSessionId(sessionId) {
    try {
        var filePath = getSessionIdFile({ createDir: true });
        (0, fs_1.writeFileSync)(filePath, sessionId, { encoding: 'utf-8', mode: 384 });
        return true;
    }
    catch (_a) {
        return false;
    }
}
/**
 * Reads the session ID from the persistence file.
 *
 * @returns The session ID if found, null otherwise
 */
function readSessionId() {
    try {
        var sessionFile = getSessionIdFile();
        var id = (0, fs_1.readFileSync)(sessionFile, 'utf-8').trim();
        return id || null;
    }
    catch (_a) {
        // File doesn't exist or read error - return null
        return null;
    }
}
/**
 * Retrieves the session ID for coordination, checking multiple sources.
 * Priority: env var > file > BRAINTRUST_SPAN_ID > generated.
 *
 * @param options.debug - If true, logs when falling back to generation
 * @returns Session identifier string (e.g., "s-m1abc23")
 */
function getSessionId(options) {
    if (options === void 0) { options = {}; }
    // First try environment (same process)
    if (process.env.COORDINATION_SESSION_ID) {
        return process.env.COORDINATION_SESSION_ID;
    }
    // Try reading from file (cross-process persistence)
    var fileId = readSessionId();
    if (fileId) {
        return fileId;
    }
    // Fallback - log if debug enabled
    if (options.debug) {
        console.error('[session-id] WARNING: No persisted session ID found, generating new one');
    }
    // Fallback to Braintrust span ID or generate new
    return generateSessionId();
}
/**
 * Returns the current project directory path.
 *
 * @returns CLAUDE_PROJECT_DIR env var or current working directory
 */
function getProject() {
    return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}
