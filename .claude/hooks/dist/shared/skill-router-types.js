"use strict";
/**
 * Shared type definitions for Skill Router hook.
 *
 * These types are used across phases of the self-improving skill system:
 * - Phase 2: Basic types and lookup stub
 * - Phase 3: Skill matching (keywords)
 * - Phase 4: Intent pattern matching
 * - Phase 5-6: Memory integration
 * - Phase 7+: JIT skill generation
 *
 * Plan: thoughts/shared/plans/self-improving-skill-system.md
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
exports.CircularDependencyError = void 0;
// =============================================================================
// Error Types
// =============================================================================
/**
 * Error thrown when a circular dependency is detected in skill prerequisites.
 */
var CircularDependencyError = /** @class */ (function (_super) {
    __extends(CircularDependencyError, _super);
    function CircularDependencyError(cyclePath) {
        var _this = _super.call(this, "Circular dependency detected: ".concat(cyclePath.join(' -> '))) || this;
        _this.cyclePath = cyclePath;
        _this.name = 'CircularDependencyError';
        return _this;
    }
    return CircularDependencyError;
}(Error));
exports.CircularDependencyError = CircularDependencyError;
