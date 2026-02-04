/**
 * Learning Extractor - Shared module for auto-learning hooks
 *
 * Extracts structured learnings from conversation events and stores them.
 * Used by PostToolUse, UserPromptSubmit, and SubagentStop hooks.
 */
export interface Learning {
    what: string;
    why: string;
    how: string;
    outcome: 'success' | 'failure' | 'partial';
    tags: string[];
    context?: string;
}
export interface LearningEvent {
    type: 'edit' | 'test_pass' | 'test_fail' | 'user_confirm' | 'periodic' | 'agent_complete';
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    tool_response?: Record<string, unknown>;
    session_id: string;
    turn_count?: number;
}
/**
 * Store a learning to archival memory via store_learning.py
 */
export declare function storeLearning(learning: Learning, sessionId: string, projectDir: string): Promise<boolean>;
/**
 * Extract learning from a test pass event
 */
export declare function extractTestPassLearning(event: LearningEvent, recentEdits: Array<{
    file: string;
    description: string;
}>): Learning | null;
/**
 * Extract learning from user confirmation
 */
export declare function extractConfirmationLearning(prompt: string, recentContext: string): Learning | null;
/**
 * Generate periodic summary learning
 */
export declare function extractPeriodicLearning(turnCount: number, recentActions: string[], sessionGoal?: string): Learning;
/**
 * Extract learning from agent completion
 */
export declare function extractAgentLearning(agentType: string, agentPrompt: string, agentResult: string): Learning;
