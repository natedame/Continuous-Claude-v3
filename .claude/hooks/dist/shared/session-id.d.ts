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
/**
 * Returns the path to the session ID persistence file.
 * Optionally creates the parent directory if it doesn't exist.
 *
 * @param options.createDir - If true, creates ~/.claude/ directory (default: false)
 * @returns Path to ~/.claude/.coordination-session-id
 */
export declare function getSessionIdFile(options?: {
    createDir?: boolean;
}): string;
/**
 * Generates a new short session ID.
 * Priority: BRAINTRUST_SPAN_ID (first 8 chars) > timestamp-based ID.
 *
 * @returns 8-character session identifier (e.g., "s-m1abc23")
 */
export declare function generateSessionId(): string;
/**
 * Writes the session ID to the persistence file.
 * Creates the ~/.claude/ directory if needed.
 *
 * @param sessionId - The session ID to persist
 * @returns true if write succeeded, false otherwise
 */
export declare function writeSessionId(sessionId: string): boolean;
/**
 * Reads the session ID from the persistence file.
 *
 * @returns The session ID if found, null otherwise
 */
export declare function readSessionId(): string | null;
/**
 * Retrieves the session ID for coordination, checking multiple sources.
 * Priority: env var > file > BRAINTRUST_SPAN_ID > generated.
 *
 * @param options.debug - If true, logs when falling back to generation
 * @returns Session identifier string (e.g., "s-m1abc23")
 */
export declare function getSessionId(options?: {
    debug?: boolean;
}): string;
/**
 * Returns the current project directory path.
 *
 * @returns CLAUDE_PROJECT_DIR env var or current working directory
 */
export declare function getProject(): string;
