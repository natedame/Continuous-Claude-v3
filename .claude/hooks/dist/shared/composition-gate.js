"use strict";
/**
 * Composition Gate (Gate 3)
 *
 * Validates pattern algebra rules before orchestration.
 * Part of the 3-gate system: Erotetic -> Resources -> Composition.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositionInvalidError = void 0;
exports.gate3Composition = gate3Composition;
exports.gate3CompositionChain = gate3CompositionChain;
var pattern_selector_js_1 = require("./pattern-selector.js");
/**
 * Error thrown when pattern composition validation fails.
 */
var CompositionInvalidError = /** @class */ (function (_super) {
    __extends(CompositionInvalidError, _super);
    function CompositionInvalidError(errors) {
        var _this = _super.call(this, "Invalid composition: ".concat(errors.join('; '))) || this;
        _this.errors = errors;
        _this.name = 'CompositionInvalidError';
        return _this;
    }
    return CompositionInvalidError;
}(Error));
exports.CompositionInvalidError = CompositionInvalidError;
/**
 * Gate 3: Composition validation.
 *
 * Validates pattern algebra rules before orchestration.
 * Throws CompositionInvalidError if validation fails.
 *
 * @param patternA - First pattern name
 * @param patternB - Second pattern name
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';')
 * @returns ValidationResult if valid
 * @throws CompositionInvalidError if invalid
 */
function gate3Composition(patternA, patternB, scope, operator) {
    if (scope === void 0) { scope = 'handoff'; }
    if (operator === void 0) { operator = ';'; }
    var result = (0, pattern_selector_js_1.validateComposition)([patternA, patternB], scope, operator);
    if (!result.valid) {
        throw new CompositionInvalidError(result.errors);
    }
    return result;
}
/**
 * Validate a chain of patterns.
 *
 * @param patterns - Array of pattern names to compose
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';')
 * @returns ValidationResult if valid
 * @throws CompositionInvalidError if invalid
 */
function gate3CompositionChain(patterns, scope, operator) {
    if (scope === void 0) { scope = 'handoff'; }
    if (operator === void 0) { operator = ';'; }
    var result = (0, pattern_selector_js_1.validateComposition)(patterns, scope, operator);
    if (!result.valid) {
        throw new CompositionInvalidError(result.errors);
    }
    return result;
}
