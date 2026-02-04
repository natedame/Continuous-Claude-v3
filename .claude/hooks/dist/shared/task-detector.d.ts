/**
 * Task Detector - Phase 7 of Self-Improving Skill System
 *
 * Detects whether a user prompt is a task that should trigger JIT skill
 * generation vs a conversational prompt that should just continue.
 *
 * Task types:
 * - implementation: build, create, implement, add feature, write
 * - research: how do I, find out, research, look into
 * - debug: fix bug, debug, investigate, troubleshoot
 * - planning: plan, design, architect, outline
 * - unknown: detected as task but type not determined
 *
 * Conversational (NOT tasks):
 * - what is, explain, show me, tell me about, describe
 * - greetings, thanks, simple questions
 *
 * Plan: thoughts/shared/plans/self-improving-skill-system.md (Phase 7)
 */
/**
 * Result from task detection operation.
 */
export interface TaskDetectionResult {
    /** Whether the prompt appears to be a task (vs conversational) */
    isTask: boolean;
    /** The type of task detected */
    taskType?: 'implementation' | 'research' | 'debug' | 'planning' | 'unknown';
    /** Confidence score 0-1 (higher = more confident) */
    confidence: number;
    /** Words/patterns that triggered detection */
    triggers: string[];
}
/**
 * Detect if a prompt is a task vs conversational.
 *
 * Returns TaskDetectionResult with:
 * - isTask: true if this appears to be a task
 * - taskType: the primary type of task detected
 * - confidence: 0-1 score of confidence
 * - triggers: the words/patterns that matched
 *
 * @param prompt - The user's prompt to analyze
 * @returns TaskDetectionResult
 */
export declare function detectTask(prompt: string): TaskDetectionResult;
