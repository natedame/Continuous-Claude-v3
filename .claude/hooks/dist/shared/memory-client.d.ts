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
/**
 * Result from a memory search operation.
 * Matches the structure returned by Python memory service.
 */
export interface MemorySearchResult {
    /** The stored content/fact */
    content: string;
    /** Similarity score (0-1) or BM25 rank for text search */
    similarity: number;
    /** Arbitrary metadata attached to the memory */
    metadata: Record<string, unknown>;
}
/**
 * Configuration options for MemoryClient.
 */
export interface MemoryClientOptions {
    /** Session ID for memory isolation */
    sessionId?: string;
    /** Optional agent ID for agent-specific memory */
    agentId?: string | null;
    /** Subprocess timeout in milliseconds (default: 5000) */
    timeoutMs?: number;
    /** Project directory (defaults to CLAUDE_PROJECT_DIR or cwd) */
    projectDir?: string;
}
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
export declare class MemoryClient {
    private readonly sessionId;
    private readonly agentId;
    private readonly timeoutMs;
    private readonly projectDir;
    constructor(options?: MemoryClientOptions);
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
    searchSimilar(query: string, limit?: number): MemorySearchResult[];
    /**
     * Store content in memory.
     *
     * @param content - The content to store
     * @param metadata - Optional metadata to attach
     * @returns Memory ID if successful, null on failure
     */
    store(content: string, metadata?: Record<string, unknown>): string | null;
    /**
     * Check if memory service is available.
     *
     * @returns true if memory service is reachable
     */
    isAvailable(): boolean;
    /**
     * Build Python script for memory search.
     */
    private buildSearchScript;
    /**
     * Build Python script for memory store.
     */
    private buildStoreScript;
    /**
     * Execute Python script via subprocess.
     */
    private runPython;
    /**
     * Normalize a search result to the standard interface.
     */
    private normalizeResult;
}
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
export declare function searchMemory(query: string, limit?: number, options?: MemoryClientOptions): MemorySearchResult[];
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
export declare function storeMemory(content: string, metadata?: Record<string, unknown>, options?: MemoryClientOptions): string | null;
/**
 * Check if memory service is available.
 *
 * @param options - Client options
 * @returns true if available
 */
export declare function isMemoryAvailable(options?: MemoryClientOptions): boolean;
/**
 * Usage tracking record for memory adaptation (Phase 18).
 */
export interface UsageRecord {
    /** Type of usage event */
    type: 'skill_match' | 'memory_match' | 'jit_generation';
    /** Name of the skill used (if applicable) */
    skillName?: string;
    /** Source of the match */
    source: 'keyword' | 'intent' | 'memory' | 'jit';
    /** Confidence score */
    confidence: number;
    /** Timestamp of usage */
    timestamp: string;
    /** Session ID where usage occurred */
    sessionId: string;
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
export declare function trackUsage(record: UsageRecord, options?: MemoryClientOptions): string | null;
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
export declare function recordSkillUsage(skillName: string, source: 'keyword' | 'intent' | 'memory', confidence: number, sessionId: string, options?: MemoryClientOptions): string | null;
