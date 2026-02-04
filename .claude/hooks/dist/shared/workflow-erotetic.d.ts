/**
 * Workflow Erotetic Gate - Proposition Extraction and Gate Evaluation
 *
 * This module provides:
 * 1. extractPropositions() - Extract framework, auth_method, database etc from input
 * 2. generateClarificationQuestions() - Generate Q-value ordered questions
 * 3. formatGateStatus() - Format as E:X R:O C:->
 * 4. evaluateEroteticGate() - Return continue/block decision
 * 5. generateBlockFeedback() - Don Norman error messages
 */
export interface Propositions {
    framework?: string;
    auth_method?: string;
    database?: string;
    hosting?: string;
    language?: string;
    testing?: string;
    [key: string]: string | undefined;
}
export interface ClarificationQuestion {
    header: string;
    proposition: string;
    options: string[];
    why: string;
}
export interface GateFeedback {
    gate: 'Erotetic' | 'Resources' | 'Composition';
    status: 'pass' | 'block' | 'warn';
    title: string;
    details: string;
    suggestion?: string;
}
export interface GateResult {
    decision: 'continue' | 'block';
    unknowns: string[];
    feedback?: GateFeedback;
}
export interface GateStatus {
    erotetic: 'pass' | 'block' | 'pending';
    resources: 'pass' | 'block' | 'pending';
    composition: 'pass' | 'block' | 'pending';
}
declare const PROPOSITION_PATTERNS: Record<string, RegExp>;
declare const CRITICAL_PROPOSITIONS: string[];
declare const Q_VALUE_ORDER: Record<string, number>;
declare function isImplementationTask(prompt: string): boolean;
/**
 * Extract propositions from a prompt using pattern matching.
 * Returns a dict where found values are lowercase strings, missing values are "UNKNOWN".
 */
export declare function extractPropositions(prompt: string): Propositions;
/**
 * Generate clarification questions for a list of unknown propositions.
 * Questions are ordered by Q-value (architectural impact).
 */
export declare function generateClarificationQuestions(unknowns: string[]): ClarificationQuestion[];
/**
 * Format gate status for display (StatusLine format).
 * Returns: "E:X R:O C:->" format where X=check, O=circle, ->=arrow, x=blocked
 */
export declare function formatGateStatus(gates: GateStatus): string;
/**
 * Evaluate the erotetic gate for a prompt.
 * Returns continue/block decision with list of unknowns.
 */
export declare function evaluateEroteticGate(prompt: string): GateResult;
/**
 * Generate structured feedback for a blocked gate (Don Norman principles).
 */
export declare function generateBlockFeedback(gate: 'Erotetic' | 'Resources' | 'Composition', unknowns: string[], suggestions?: string[]): GateFeedback;
export { isImplementationTask, CRITICAL_PROPOSITIONS, PROPOSITION_PATTERNS, Q_VALUE_ORDER, };
