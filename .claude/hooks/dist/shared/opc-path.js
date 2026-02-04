"use strict";
/**
 * Cross-platform OPC directory resolution for hooks.
 *
 * Supports running Claude Code in any directory by:
 * 1. Checking CLAUDE_OPC_DIR environment variable (global setup)
 * 2. Falling back to ${CLAUDE_PROJECT_DIR}/opc (local setup)
 * 3. Gracefully degrading if neither exists
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpcDir = getOpcDir;
exports.requireOpcDir = requireOpcDir;
exports.hasOpcDir = hasOpcDir;
var fs_1 = require("fs");
var path_1 = require("path");
/**
 * Get the OPC directory path, or null if not available.
 *
 * Resolution order:
 * 1. CLAUDE_OPC_DIR env var (for global hook installation)
 * 2. ${CLAUDE_PROJECT_DIR}/opc (for running within CC project)
 * 3. ${CWD}/opc (fallback)
 * 4. ~/.claude (global installation - scripts at ~/.claude/scripts/)
 *
 * @returns Path to opc directory, or null if not found
 */
function getOpcDir() {
    // 1. Try env var (works when hooks are installed globally)
    var envOpcDir = process.env.CLAUDE_OPC_DIR;
    if (envOpcDir && (0, fs_1.existsSync)(envOpcDir)) {
        return envOpcDir;
    }
    // 2. Try project-relative path
    var projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    var localOpc = (0, path_1.join)(projectDir, 'opc');
    if ((0, fs_1.existsSync)(localOpc)) {
        return localOpc;
    }
    // 3. Try global ~/.claude (where wizard installs scripts)
    // Scripts are at ~/.claude/scripts/core/, so we use ~/.claude as base
    var homeDir = process.env.HOME || process.env.USERPROFILE || '';
    if (homeDir) {
        var globalClaude = (0, path_1.join)(homeDir, '.claude');
        var globalScripts = (0, path_1.join)(globalClaude, 'scripts', 'core');
        if ((0, fs_1.existsSync)(globalScripts)) {
            return globalClaude;
        }
    }
    // 4. Not available
    return null;
}
/**
 * Get OPC directory or exit gracefully if not available.
 *
 * Use this in hooks that require OPC infrastructure.
 * If OPC is not available, outputs {"result": "continue"} and exits,
 * allowing the hook to be a no-op in non-CC projects.
 *
 * @returns Path to opc directory (never null - exits if not found)
 */
function requireOpcDir() {
    var opcDir = getOpcDir();
    if (!opcDir) {
        // Graceful degradation - hook becomes no-op
        console.log(JSON.stringify({ result: "continue" }));
        process.exit(0);
    }
    return opcDir;
}
/**
 * Check if OPC infrastructure is available.
 *
 * Use this for optional OPC features that should silently skip
 * when running outside a Continuous-Claude environment.
 *
 * @returns true if OPC directory exists and is accessible
 */
function hasOpcDir() {
    return getOpcDir() !== null;
}
