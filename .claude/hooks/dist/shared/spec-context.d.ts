/**
 * Spec Context Management
 *
 * Shared utilities for managing spec-context.json - the central state
 * that tracks which spec/phase each session is implementing.
 */
export interface AgentScope {
    section: string;
    file_patterns: string[];
    registered_at: string;
    parent_session?: string;
}
export interface SessionContext {
    active_spec: string | null;
    current_phase: string | null;
    activated_at: string;
    edit_count: number;
    last_checkpoint: number;
    agents: Record<string, AgentScope>;
}
export interface SpecContext {
    version: string;
    sessions: Record<string, SessionContext>;
}
export declare function getSpecContextPath(projectDir: string): string;
export declare function loadSpecContext(projectDir: string): SpecContext;
export declare function saveSpecContext(projectDir: string, context: SpecContext): void;
export declare function getSessionContext(projectDir: string, sessionId: string): SessionContext | null;
export declare function createEmptySessionContext(): SessionContext;
export declare function setSessionSpec(projectDir: string, sessionId: string, specPath: string, phase?: string): void;
export declare function setSessionPhase(projectDir: string, sessionId: string, phase: string): void;
export declare function registerAgent(projectDir: string, sessionId: string, parentSessionId: string | undefined, scope: Omit<AgentScope, 'registered_at' | 'parent_session'>): void;
export declare function unregisterAgent(projectDir: string, sessionId: string): void;
export declare function incrementEditCount(projectDir: string, sessionId: string): {
    count: number;
    needsCheckpoint: boolean;
};
export declare function clearSession(projectDir: string, sessionId: string): void;
export declare function findSpecFile(projectDir: string, specName: string): string | null;
export declare function extractSpecRequirements(specContent: string, section?: string): string;
export declare function extractAcceptanceCriteria(specContent: string, section?: string): string[];
