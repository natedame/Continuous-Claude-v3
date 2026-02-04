/**
 * Cross-platform OPC directory resolution for hooks.
 *
 * Supports running Claude Code in any directory by:
 * 1. Checking CLAUDE_OPC_DIR environment variable (global setup)
 * 2. Falling back to ${CLAUDE_PROJECT_DIR}/opc (local setup)
 * 3. Gracefully degrading if neither exists
 */
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
export declare function getOpcDir(): string | null;
/**
 * Get OPC directory or exit gracefully if not available.
 *
 * Use this in hooks that require OPC infrastructure.
 * If OPC is not available, outputs {"result": "continue"} and exits,
 * allowing the hook to be a no-op in non-CC projects.
 *
 * @returns Path to opc directory (never null - exits if not found)
 */
export declare function requireOpcDir(): string;
/**
 * Check if OPC infrastructure is available.
 *
 * Use this for optional OPC features that should silently skip
 * when running outside a Continuous-Claude environment.
 *
 * @returns true if OPC directory exists and is accessible
 */
export declare function hasOpcDir(): boolean;
