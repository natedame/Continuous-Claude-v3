"use strict";
/**
 * Erotetic Termination Logic - Phase 9 of Self-Improving Skill System
 *
 * Termination conditions for the erotetic loop:
 * 1. All Q-heuristics resolved (E(X,Q)=empty)
 * 2. User says "use defaults"
 * 3. Hard cap hit (max 4 questions already asked)
 *
 * Plan reference: thoughts/shared/plans/self-improving-skill-system.md (Phase 9)
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_QUESTIONS_TOTAL = void 0;
exports.detectDefaultsIntent = detectDefaultsIntent;
exports.applyDefaults = applyDefaults;
exports.checkTermination = checkTermination;
// =============================================================================
// Constants
// =============================================================================
/**
 * Maximum total questions to ask before terminating.
 * This is the hard cap for the erotetic loop.
 */
exports.MAX_QUESTIONS_TOTAL = 4;
/**
 * Patterns that indicate user wants to use defaults.
 * These trigger immediate termination with defaults applied.
 */
var USE_DEFAULTS_PATTERNS = [
    /\bjust\s+use\s+defaults?\b/i,
    /\bgo\s+with\s+defaults?\b/i,
    /\buse\s+(the\s+)?default\s+values?\b/i,
    /\bpick\s+for\s+me\b/i,
    /\byou\s+decide\b/i,
    /\bwhatever\s+works\b/i,
    /\byour\s+choice\b/i,
    /\byou\s+choose\b/i,
    /\bdefaults?\s+(are\s+)?fine\b/i,
    /\bi\s+don'?t\s+care\b/i,
];
// =============================================================================
// Functions
// =============================================================================
/**
 * Detect if the user's response indicates they want to use defaults.
 *
 * @param response - The user's response text
 * @returns true if user wants to use defaults
 */
function detectDefaultsIntent(response) {
    var text = response.toLowerCase().trim();
    return USE_DEFAULTS_PATTERNS.some(function (pattern) { return pattern.test(text); });
}
/**
 * Apply default values to unresolved Q-heuristics.
 * Creates a new object with resolved values plus defaults.
 *
 * @param resolved - Already resolved Q-heuristic answers
 * @param unresolved - Q-heuristics that need default values
 * @returns New object with all values (resolved + defaults)
 */
function applyDefaults(resolved, unresolved) {
    var _a;
    // Create a new object (don't mutate input)
    var result = __assign({}, resolved);
    // Apply defaults for unresolved questions
    for (var _i = 0, unresolved_1 = unresolved; _i < unresolved_1.length; _i++) {
        var q = unresolved_1[_i];
        // Only apply default if not already resolved
        if (!(q.id in result)) {
            result[q.id] = (_a = q.default) !== null && _a !== void 0 ? _a : '';
        }
    }
    return result;
}
/**
 * Check if the erotetic loop should terminate.
 *
 * Priority order:
 * 1. All resolved -> terminate with 'all_resolved'
 * 2. User requested defaults -> terminate with 'defaults_requested'
 * 3. Max questions hit -> terminate with 'max_questions'
 * 4. Otherwise -> continue asking
 *
 * @param state - Current termination state
 * @returns Termination result with reason and final resolution
 */
function checkTermination(state) {
    var resolved = state.resolved, unresolved = state.unresolved, questionsAsked = state.questionsAsked, userRequestedDefaults = state.userRequestedDefaults;
    // Priority 1: All Q-heuristics resolved
    if (unresolved.length === 0) {
        return {
            shouldTerminate: true,
            reason: 'all_resolved',
            finalResolution: __assign({}, resolved),
        };
    }
    // Priority 2: User explicitly requested defaults
    if (userRequestedDefaults) {
        return {
            shouldTerminate: true,
            reason: 'defaults_requested',
            finalResolution: applyDefaults(resolved, unresolved),
        };
    }
    // Priority 3: Max questions reached
    if (questionsAsked >= exports.MAX_QUESTIONS_TOTAL) {
        return {
            shouldTerminate: true,
            reason: 'max_questions',
            finalResolution: applyDefaults(resolved, unresolved),
        };
    }
    // Default: Continue asking questions
    return {
        shouldTerminate: false,
        reason: 'continue',
        finalResolution: __assign({}, resolved), // Return current state
    };
}
