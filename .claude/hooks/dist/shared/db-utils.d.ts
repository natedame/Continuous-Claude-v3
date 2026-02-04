/**
 * Shared database utilities for Claude Code hooks.
 *
 * Extracted from pre-tool-use-broadcast.ts as part of the
 * pattern-aware hooks architecture (Phase 2).
 *
 * Exports:
 * - getDbPath(): Returns path to coordination.db
 * - queryDb(): Executes Python subprocess to query SQLite
 * - runPythonQuery(): Alternative that returns success/stdout/stderr object
 * - getActiveAgentCount(): Returns count of running agents (Phase 2: Resource Limits)
 */
import type { QueryResult } from './types.js';
export { SAFE_ID_PATTERN, isValidId } from './pattern-router.js';
/**
 * Get the path to the coordination database.
 *
 * Uses CLAUDE_PROJECT_DIR environment variable if set,
 * otherwise falls back to process.cwd().
 *
 * @returns Absolute path to coordination.db
 */
export declare function getDbPath(): string;
/**
 * Execute a Python query against the coordination database.
 *
 * Uses spawnSync with argument array to prevent command injection.
 * The Python code receives arguments via sys.argv.
 *
 * @param pythonQuery - Python code to execute (receives args via sys.argv)
 * @param args - Arguments passed to Python (sys.argv[1], sys.argv[2], ...)
 * @returns stdout from Python subprocess
 * @throws Error if Python subprocess fails
 */
export declare function queryDb(pythonQuery: string, args: string[]): string;
/**
 * Execute a Python query and return structured result.
 *
 * Unlike queryDb(), this function does not throw on error.
 * Instead, it returns a result object with success, stdout, and stderr.
 *
 * @param script - Python code to execute (receives args via sys.argv)
 * @param args - Arguments passed to Python (sys.argv[1], sys.argv[2], ...)
 * @returns Object with success boolean, stdout string, and stderr string
 */
export declare function runPythonQuery(script: string, args: string[]): QueryResult;
/**
 * Execute a Python query with exponential backoff retry on transient failures.
 *
 * PHASE 3 SELF-HEALING: Handles SQLite busy/locked errors with automatic retry.
 * Retries up to 3 times with exponential backoff (100ms, 200ms, 400ms).
 *
 * Retry conditions:
 * - Exit code != 0 AND stderr contains "database is locked" or "busy"
 * - Exit code != 0 AND stderr contains "unable to open database"
 *
 * @param script - Python code to execute (receives args via sys.argv)
 * @param args - Arguments passed to Python (sys.argv[1], sys.argv[2], ...)
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Object with success boolean, stdout string, stderr string, and retries count
 */
export declare function runPythonQueryWithRetry(script: string, args: string[], maxRetries?: number): QueryResult & {
    retries: number;
};
/**
 * Register a new agent in the coordination database.
 *
 * Inserts a new agent record with status='running'.
 * Creates the database and tables if they don't exist.
 * Automatically detects source from environment (AGENTICA_SERVER env var).
 *
 * @param agentId - Unique agent identifier
 * @param sessionId - Session that spawned the agent
 * @param pattern - Coordination pattern (swarm, hierarchical, etc.)
 * @param pid - Process ID for orphan detection (optional)
 * @returns Object with success boolean and any error message
 */
export declare function registerAgent(agentId: string, sessionId: string, pattern?: string | null, pid?: number | null): {
    success: boolean;
    error?: string;
};
/**
 * Mark an agent as completed in the coordination database.
 *
 * Updates the agent's status and sets completed_at timestamp.
 *
 * @param agentId - Agent identifier to complete
 * @param status - Final status ('completed' or 'failed')
 * @param errorMessage - Optional error message for failed status
 * @returns Object with success boolean and any error message
 */
export declare function completeAgent(agentId: string, status?: string, errorMessage?: string | null): {
    success: boolean;
    error?: string;
};
/**
 * Detect if this agent is part of a swarm (concurrent spawn pattern).
 *
 * Checks if there are multiple agents in the same session spawned within
 * a short time window (5 seconds). If so, updates all of them to pattern="swarm".
 *
 * This enables automatic swarm detection for Claude Code Task tool spawns
 * without requiring explicit PATTERN_TYPE environment variable.
 *
 * @param sessionId - Session to check for concurrent spawns
 * @returns true if swarm pattern was detected and applied
 */
export declare function detectAndTagSwarm(sessionId: string): boolean;
/**
 * Get the count of active (running) agents across all sessions.
 *
 * Queries the coordination database for agents with status='running'.
 * Returns 0 if:
 * - Database doesn't exist
 * - Database query fails
 * - agents table doesn't exist
 *
 * Uses runPythonQuery() pattern to safely execute the SQLite query.
 *
 * @returns Number of running agents, or 0 on any error
 */
export declare function getActiveAgentCount(): number;
