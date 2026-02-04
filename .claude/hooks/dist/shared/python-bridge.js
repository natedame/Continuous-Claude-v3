"use strict";
/**
 * Python Bridge
 *
 * Subprocess wrappers to call Python validation and inference scripts.
 * Provides type-safe interface between TypeScript hooks and Python logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.callValidateComposition = callValidateComposition;
exports.callPatternInference = callPatternInference;
var child_process_1 = require("child_process");
var path_1 = require("path");
var url_1 = require("url");
// Get project root - from .claude/hooks/src/shared/ go up 4 levels
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = (0, path_1.dirname)(__filename);
var PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || (0, path_1.resolve)(__dirname, '..', '..', '..', '..');
/**
 * Call Python validate_composition.py with JSON output.
 *
 * @param patternA - First pattern name
 * @param patternB - Second pattern name
 * @param scope - State sharing scope
 * @param operator - Composition operator
 * @returns ValidationResult with validity, errors, warnings, and scope trace
 */
function callValidateComposition(patternA, patternB, scope, operator) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (operator === void 0) { operator = ';'; }
    var expr = "".concat(patternA, " ").concat(operator, "[").concat(scope, "] ").concat(patternB);
    var cmd = "uv run python scripts/validate_composition.py --json \"".concat(expr, "\"");
    try {
        var stdout = (0, child_process_1.execSync)(cmd, {
            cwd: PROJECT_DIR,
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        var result = JSON.parse(stdout);
        // Map Python snake_case to TypeScript camelCase
        return {
            valid: (_a = result.all_valid) !== null && _a !== void 0 ? _a : false,
            composition: (_b = result.expression) !== null && _b !== void 0 ? _b : expr,
            errors: (_e = (_d = (_c = result.compositions) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.errors) !== null && _e !== void 0 ? _e : [],
            warnings: (_h = (_g = (_f = result.compositions) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.warnings) !== null && _h !== void 0 ? _h : [],
            scopeTrace: (_l = (_k = (_j = result.compositions) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.scope_trace) !== null && _l !== void 0 ? _l : [],
        };
    }
    catch (err) {
        var errorMessage = err instanceof Error ? err.message : String(err);
        return {
            valid: false,
            composition: expr,
            errors: ["Bridge error: ".concat(errorMessage)],
            warnings: [],
            scopeTrace: [],
        };
    }
}
/**
 * Call Python pattern_inference.py to infer best pattern for a task.
 *
 * @param prompt - Task description
 * @returns PatternInferenceResult with pattern, confidence, and signals
 */
function callPatternInference(prompt) {
    var _a, _b, _c, _d, _e, _f, _g;
    // Escape double quotes and backslashes for shell safety
    var escaped = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    var cmd = "uv run python scripts/agentica_patterns/pattern_inference.py \"".concat(escaped, "\"");
    try {
        var stdout = (0, child_process_1.execSync)(cmd, {
            cwd: PROJECT_DIR,
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        var result = JSON.parse(stdout);
        return {
            pattern: result.pattern,
            confidence: (_a = result.confidence) !== null && _a !== void 0 ? _a : 0.5,
            signals: (_b = result.signals) !== null && _b !== void 0 ? _b : [],
            needsClarification: (_c = result.needs_clarification) !== null && _c !== void 0 ? _c : false,
            clarificationProbe: (_d = result.clarification_probe) !== null && _d !== void 0 ? _d : null,
            ambiguityType: (_e = result.ambiguity_type) !== null && _e !== void 0 ? _e : null,
            alternatives: ((_f = result.alternatives) !== null && _f !== void 0 ? _f : []),
            workBreakdown: (_g = result.work_breakdown) !== null && _g !== void 0 ? _g : 'Task decomposition',
        };
    }
    catch (err) {
        // Fallback to hierarchical on error
        return {
            pattern: 'hierarchical',
            confidence: 0.3,
            signals: ['bridge error fallback'],
            needsClarification: true,
            clarificationProbe: 'Could not infer pattern - what would help?',
            ambiguityType: 'scope',
            alternatives: [],
            workBreakdown: 'Coordinated task decomposition with specialists',
        };
    }
}
