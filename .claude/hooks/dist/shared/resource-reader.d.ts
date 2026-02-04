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
/**
 * Resource state from the JSON file written by status.sh.
 */
export interface ResourceState {
    /** Free RAM in MB */
    freeMemMB: number;
    /** Number of currently running agents */
    activeAgents: number;
    /** Maximum agents allowed based on available RAM */
    maxAgents: number;
    /** Current context usage percentage (0-100) */
    contextPct: number;
}
/**
 * Default resource state used when file is missing or corrupt.
 *
 * Values chosen to be conservative:
 * - freeMemMB: 4096 (4GB, reasonable minimum)
 * - activeAgents: 0 (assume none running)
 * - maxAgents: 10 (reasonable default limit)
 * - contextPct: 0 (assume fresh context)
 */
export declare const DEFAULT_RESOURCE_STATE: ResourceState;
/**
 * Get the session ID from environment variables.
 *
 * Priority:
 * 1. CLAUDE_SESSION_ID (if set by Claude Code)
 * 2. PPID (parent process ID as fallback)
 *
 * @returns Session ID string
 */
export declare function getSessionId(): string;
/**
 * Get the path to the resource state JSON file.
 *
 * @param sessionId - Session ID to use in the filename
 * @returns Path to {tmpdir}/claude-resources-{sessionId}.json
 */
export declare function getResourceFilePath(sessionId: string): string;
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
export declare function readResourceState(): ResourceState | null;
