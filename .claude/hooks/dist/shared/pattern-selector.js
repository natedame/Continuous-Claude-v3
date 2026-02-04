"use strict";
/**
 * Pattern Selector
 *
 * Selects appropriate patterns for tasks and validates pattern compositions.
 * Uses Python bridge to call validate_composition.py and pattern_inference.py.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_PATTERNS = void 0;
exports.selectPattern = selectPattern;
exports.validateComposition = validateComposition;
var python_bridge_js_1 = require("./python-bridge.js");
/**
 * All supported orchestration patterns.
 * Matches Python PATTERNS dict in validate_composition.py
 */
exports.SUPPORTED_PATTERNS = [
    'swarm',
    'jury',
    'pipeline',
    'generator_critic',
    'hierarchical',
    'map_reduce',
    'blackboard',
    'circuit_breaker',
    'chain_of_responsibility',
    'adversarial',
    'event_driven',
    'consensus',
    'aggregator',
    'broadcast',
];
/**
 * Select the best pattern for a given task.
 * Uses Python pattern_inference.py via subprocess.
 */
function selectPattern(task) {
    var result = (0, python_bridge_js_1.callPatternInference)(task.description);
    return {
        pattern: result.pattern,
        confidence: result.confidence,
        reason: result.workBreakdown,
    };
}
/**
 * Validate that a composition of patterns is valid.
 * Uses Python validate_composition.py via subprocess.
 *
 * For chains of 3+ patterns, validates pairwise left-to-right.
 *
 * @param patterns - Array of pattern names to compose
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';' sequential)
 * @returns ValidationResult with validity, errors, warnings, and trace
 */
function validateComposition(patterns, scope, operator) {
    if (scope === void 0) { scope = 'handoff'; }
    if (operator === void 0) { operator = ';'; }
    if (patterns.length === 0) {
        return {
            valid: true,
            composition: '',
            errors: [],
            warnings: [],
            scopeTrace: [],
        };
    }
    if (patterns.length === 1) {
        return {
            valid: true,
            composition: patterns[0],
            errors: [],
            warnings: [],
            scopeTrace: [],
        };
    }
    // Validate pairwise (left-associative)
    var allWarnings = [];
    var allTraces = [];
    var compositionStr = patterns[0];
    for (var i = 0; i < patterns.length - 1; i++) {
        var result = (0, python_bridge_js_1.callValidateComposition)(patterns[i], patterns[i + 1], scope, operator);
        if (!result.valid) {
            return {
                valid: false,
                composition: compositionStr,
                errors: result.errors,
                warnings: result.warnings,
                scopeTrace: result.scopeTrace,
            };
        }
        allWarnings.push.apply(allWarnings, result.warnings);
        allTraces.push.apply(allTraces, result.scopeTrace);
        compositionStr = result.composition;
    }
    return {
        valid: true,
        composition: compositionStr,
        errors: [],
        warnings: allWarnings,
        scopeTrace: allTraces,
    };
}
