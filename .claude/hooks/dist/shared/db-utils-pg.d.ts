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
import type { QueryResult } from './types.js';
export { SAFE_ID_PATTERN, isValidId } from './pattern-router.js';
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
export declare function getPgConnectionString(): string;
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
export declare function runPgQuery(pythonCode: string, args?: string[]): QueryResult;
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
export declare function queryBroadcasts(swarmId: string, agentId: string, limit?: number): {
    success: boolean;
    broadcasts: BroadcastMessage[];
};
/**
 * Query pipeline artifacts from PostgreSQL.
 *
 * Queries the pipeline_artifacts table for artifacts from upstream stages.
 *
 * @param pipelineId - Pipeline identifier
 * @param currentStage - Current stage index (will get artifacts from earlier stages)
 * @returns Array of pipeline artifacts
 */
export declare function queryPipelineArtifacts(pipelineId: string, currentStage: number): {
    success: boolean;
    artifacts: PipelineArtifact[];
};
/**
 * Get count of active (running) agents from PostgreSQL.
 *
 * Queries the agents table for agents with status='running'.
 *
 * @returns Number of running agents, or 0 on any error
 */
export declare function getActiveAgentCountPg(): number;
/**
 * Register a new agent in PostgreSQL.
 *
 * @param agentId - Unique agent identifier
 * @param sessionId - Session that spawned the agent
 * @param pattern - Coordination pattern (swarm, hierarchical, etc.)
 * @param pid - Process ID for orphan detection
 * @returns Object with success boolean and any error message
 */
export declare function registerAgentPg(agentId: string, sessionId: string, pattern?: string | null, pid?: number | null): {
    success: boolean;
    error?: string;
};
/**
 * Mark an agent as completed in PostgreSQL.
 *
 * @param agentId - Agent identifier to complete
 * @param status - Final status ('completed' or 'failed')
 * @param errorMessage - Optional error message for failed status
 * @returns Object with success boolean and any error message
 */
export declare function completeAgentPg(agentId: string, status?: string, errorMessage?: string | null): {
    success: boolean;
    error?: string;
};
export interface BroadcastMessage {
    sender: string;
    type: string;
    payload: Record<string, unknown>;
    time: string | null;
}
export interface PipelineArtifact {
    stage: number;
    type: string;
    path: string | null;
    content: string | null;
    time: string | null;
}
/**
 * Register a session in the coordination layer.
 *
 * @param sessionId - Unique session identifier
 * @param project - Project directory path
 * @param workingOn - Description of current task
 * @returns Object with success boolean and any error message
 */
export declare function registerSession(sessionId: string, project: string, workingOn?: string): {
    success: boolean;
    error?: string;
};
/**
 * Get active sessions from the coordination layer.
 *
 * @param project - Optional project filter
 * @returns Array of active sessions
 */
export declare function getActiveSessions(project?: string): {
    success: boolean;
    sessions: SessionInfo[];
};
/**
 * Check if a file is claimed by another session.
 *
 * @param filePath - Path to the file
 * @param project - Project directory
 * @param mySessionId - Current session ID
 * @returns Claim info if claimed by another session
 */
export declare function checkFileClaim(filePath: string, project: string, mySessionId: string): {
    claimed: boolean;
    claimedBy?: string;
    claimedAt?: string;
};
/**
 * Claim a file for the current session.
 *
 * @param filePath - Path to the file
 * @param project - Project directory
 * @param sessionId - Session claiming the file
 */
export declare function claimFile(filePath: string, project: string, sessionId: string): {
    success: boolean;
};
/**
 * Broadcast a finding to the coordination layer.
 *
 * @param sessionId - Session that discovered the finding
 * @param topic - Topic/category of the finding
 * @param finding - The finding content
 * @param relevantTo - Array of files/topics this is relevant to
 */
export declare function broadcastFinding(sessionId: string, topic: string, finding: string, relevantTo?: string[]): {
    success: boolean;
};
/**
 * Get relevant findings for a topic or file.
 *
 * @param query - Topic or file path to search for
 * @param excludeSessionId - Session to exclude (usually current session)
 * @param limit - Maximum findings to return
 */
export declare function getRelevantFindings(query: string, excludeSessionId: string, limit?: number): {
    success: boolean;
    findings: FindingInfo[];
};
export interface SessionInfo {
    id: string;
    project: string;
    working_on: string;
    started_at: string | null;
    last_heartbeat: string | null;
}
export interface FindingInfo {
    session_id: string;
    topic: string;
    finding: string;
    relevant_to: string[];
    created_at: string | null;
}
