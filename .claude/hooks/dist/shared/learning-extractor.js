"use strict";
/**
 * Learning Extractor - Shared module for auto-learning hooks
 *
 * Extracts structured learnings from conversation events and stores them.
 * Used by PostToolUse, UserPromptSubmit, and SubagentStop hooks.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeLearning = storeLearning;
exports.extractTestPassLearning = extractTestPassLearning;
exports.extractConfirmationLearning = extractConfirmationLearning;
exports.extractPeriodicLearning = extractPeriodicLearning;
exports.extractAgentLearning = extractAgentLearning;
var child_process_1 = require("child_process");
var opc_path_js_1 = require("./opc-path.js");
/**
 * Store a learning to archival memory via store_learning.py
 */
function storeLearning(learning, sessionId, projectDir) {
    return __awaiter(this, void 0, void 0, function () {
        var opcDir, args, result;
        return __generator(this, function (_a) {
            opcDir = (0, opc_path_js_1.getOpcDir)();
            if (!opcDir)
                return [2 /*return*/, false]; // Graceful degradation
            args = [
                'run', 'python', 'scripts/core/store_learning.py',
                '--session-id', sessionId
            ];
            // Map learning to store_learning.py interface
            if (learning.outcome === 'success') {
                args.push('--worked', "".concat(learning.what, ". ").concat(learning.how));
            }
            else if (learning.outcome === 'failure') {
                args.push('--failed', "".concat(learning.what, ". ").concat(learning.why));
            }
            else {
                // Partial/progress - use patterns
                args.push('--patterns', "".concat(learning.what, ": ").concat(learning.how));
            }
            // Add decisions if there's a why
            if (learning.why && learning.outcome !== 'failure') {
                args.push('--decisions', learning.why);
            }
            result = (0, child_process_1.spawnSync)('uv', args, {
                encoding: 'utf-8',
                cwd: opcDir,
                env: __assign(__assign({}, process.env), { PYTHONPATH: opcDir }),
                timeout: 10000
            });
            return [2 /*return*/, result.status === 0];
        });
    });
}
/**
 * Format learning into storable content
 */
function formatLearningContent(learning) {
    var lines = [];
    lines.push("What: ".concat(learning.what));
    lines.push("Why: ".concat(learning.why));
    lines.push("How: ".concat(learning.how));
    lines.push("Outcome: ".concat(learning.outcome));
    if (learning.context) {
        lines.push("Context: ".concat(learning.context));
    }
    return lines.join('\n');
}
/**
 * Extract learning from a test pass event
 */
function extractTestPassLearning(event, recentEdits) {
    if (!event.tool_response)
        return null;
    var output = String(event.tool_response.output || '');
    // Detect test pass patterns
    var passPatterns = [
        /(\d+) passed/i,
        /tests? passed/i,
        /ok \(/i,
        /success/i,
        /\u2713/, // checkmark
    ];
    var isPass = passPatterns.some(function (p) { return p.test(output); });
    if (!isPass)
        return null;
    // Build learning from recent edits
    var editSummary = recentEdits
        .map(function (e) { return "".concat(e.file, ": ").concat(e.description); })
        .join('; ');
    return {
        what: "Tests passed after: ".concat(editSummary || 'recent changes'),
        why: 'Changes addressed the failing tests',
        how: recentEdits.length > 0
            ? "Files modified: ".concat(recentEdits.map(function (e) { return e.file; }).join(', '))
            : 'See recent edit history',
        outcome: 'success',
        tags: ['test_pass', 'fix', 'auto_extracted'],
        context: output.slice(0, 200)
    };
}
/**
 * Extract learning from user confirmation
 */
function extractConfirmationLearning(prompt, recentContext) {
    // Detect confirmation patterns
    var confirmPatterns = [
        /\b(works?|working)\b/i,
        /\b(good|great|perfect|nice)\b/i,
        /\b(thanks?|thank you)\b/i,
        /\b(yes|yep|yeah)\b/i,
        /\bthat('s| is) (it|right|correct)\b/i,
    ];
    var isConfirmation = confirmPatterns.some(function (p) { return p.test(prompt); });
    if (!isConfirmation)
        return null;
    // Need some recent context to make this meaningful
    if (!recentContext || recentContext.length < 20)
        return null;
    return {
        what: "User confirmed: \"".concat(prompt.slice(0, 50), "\""),
        why: 'Approach/solution worked for user',
        how: recentContext.slice(0, 300),
        outcome: 'success',
        tags: ['user_confirmed', 'solution', 'auto_extracted']
    };
}
/**
 * Generate periodic summary learning
 */
function extractPeriodicLearning(turnCount, recentActions, sessionGoal) {
    return {
        what: "Turn ".concat(turnCount, " checkpoint: ").concat(recentActions.length, " actions"),
        why: sessionGoal || 'Session progress tracking',
        how: recentActions.join('; ').slice(0, 500),
        outcome: 'partial',
        tags: ['periodic', 'progress', 'procedural', 'auto_extracted']
    };
}
/**
 * Extract learning from agent completion
 */
function extractAgentLearning(agentType, agentPrompt, agentResult) {
    return {
        what: "Agent ".concat(agentType, " completed task"),
        why: agentPrompt.slice(0, 200),
        how: "Result: ".concat(agentResult.slice(0, 300)),
        outcome: agentResult.toLowerCase().includes('error') ? 'failure' : 'success',
        tags: ['agent', agentType, 'auto_extracted'],
        context: agentPrompt
    };
}
