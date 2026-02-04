"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Q_VALUE_ORDER = exports.PROPOSITION_PATTERNS = exports.CRITICAL_PROPOSITIONS = void 0;
exports.extractPropositions = extractPropositions;
exports.generateClarificationQuestions = generateClarificationQuestions;
exports.formatGateStatus = formatGateStatus;
exports.evaluateEroteticGate = evaluateEroteticGate;
exports.generateBlockFeedback = generateBlockFeedback;
exports.isImplementationTask = isImplementationTask;
// ============================================================
// Constants
// ============================================================
// Pattern to detect implementation tasks
var IMPL_PATTERNS = /\b(build|implement|create|add|develop|design|set up|write)\b/i;
var NON_IMPL_PATTERNS = /\b(fix|run|show|explain|list|search|rename|delete|update)\b/i;
// Domain-specific proposition extractors
var PROPOSITION_PATTERNS = {
    framework: /\b(fastapi|express|hono|gin|django|flask|rails|spring|nest\.?js)\b/i,
    auth_method: /\b(jwt|oauth\d?|session|api[- ]?key|basic auth|bearer|saml|oidc)\b/i,
    database: /\b(postgres|postgresql|mysql|sqlite|mongodb|redis|dynamodb|firestore)\b/i,
    hosting: /\b(vercel|aws|gcp|azure|heroku|railway|fly\.io|cloudflare)\b/i,
    language: /\b(python|typescript|javascript|go|rust|java|ruby|php)\b/i,
    testing: /\b(pytest|jest|vitest|mocha|junit|rspec)\b/i,
};
exports.PROPOSITION_PATTERNS = PROPOSITION_PATTERNS;
// Critical propositions - gate blocks if these are missing
var CRITICAL_PROPOSITIONS = ['framework', 'auth_method', 'database'];
exports.CRITICAL_PROPOSITIONS = CRITICAL_PROPOSITIONS;
// Q-value ordering (higher = more architectural impact, asked first)
var Q_VALUE_ORDER = {
    framework: 100,
    database: 90,
    auth_method: 80,
    hosting: 60,
    language: 50,
    testing: 30,
};
exports.Q_VALUE_ORDER = Q_VALUE_ORDER;
// Default options for common propositions
var PROPOSITION_OPTIONS = {
    framework: ['FastAPI', 'Express', 'Django', 'Flask', 'NestJS', 'Rails', 'Spring', 'Hono'],
    auth_method: ['JWT', 'OAuth', 'Session', 'API Key', 'SAML', 'OIDC'],
    database: ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'DynamoDB'],
    hosting: ['AWS', 'GCP', 'Azure', 'Vercel', 'Heroku', 'Railway', 'Fly.io'],
    language: ['Python', 'TypeScript', 'JavaScript', 'Go', 'Rust', 'Java', 'Ruby'],
    testing: ['pytest', 'Jest', 'Vitest', 'Mocha', 'JUnit', 'RSpec'],
};
// Why explanations for propositions
var PROPOSITION_WHY = {
    framework: 'The framework choice impacts architecture, dependencies, and development patterns.',
    auth_method: 'Authentication choice affects security architecture and integration complexity.',
    database: 'Database selection impacts data modeling, scalability, and query patterns.',
    hosting: 'Hosting platform choice affects deployment, scaling, and operational complexity.',
    language: 'Language choice depends on team expertise, ecosystem, and performance needs.',
    testing: 'Testing framework choice affects test structure and CI/CD integration.',
};
// ============================================================
// Utility Functions
// ============================================================
function findFirstMatch(prompt, pattern) {
    var _a;
    var match = prompt.match(pattern);
    return (_a = match === null || match === void 0 ? void 0 : match.index) !== null && _a !== void 0 ? _a : -1;
}
function isImplementationTask(prompt) {
    if (!(prompt === null || prompt === void 0 ? void 0 : prompt.trim()))
        return false;
    var implPos = findFirstMatch(prompt, IMPL_PATTERNS);
    var nonImplPos = findFirstMatch(prompt, NON_IMPL_PATTERNS);
    if (implPos === -1)
        return false;
    if (nonImplPos === -1)
        return true;
    return implPos < nonImplPos;
}
function toTitleCase(str) {
    return str
        .split('_')
        .map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1); })
        .join(' ');
}
// ============================================================
// Main Functions
// ============================================================
/**
 * Extract propositions from a prompt using pattern matching.
 * Returns a dict where found values are lowercase strings, missing values are "UNKNOWN".
 */
function extractPropositions(prompt) {
    var propositions = {};
    // Handle empty or whitespace-only input
    if (!(prompt === null || prompt === void 0 ? void 0 : prompt.trim())) {
        for (var _i = 0, _a = Object.keys(PROPOSITION_PATTERNS); _i < _a.length; _i++) {
            var propName = _a[_i];
            propositions[propName] = 'UNKNOWN';
        }
        return propositions;
    }
    for (var _b = 0, _c = Object.entries(PROPOSITION_PATTERNS); _b < _c.length; _b++) {
        var _d = _c[_b], propName = _d[0], pattern = _d[1];
        var match = prompt.match(pattern);
        if (match) {
            // Normalize to lowercase and handle special cases
            var value = match[0].toLowerCase();
            // Normalize nest.js to nestjs
            if (value === 'nest.js')
                value = 'nestjs';
            // Normalize postgresql to postgresql
            if (value === 'postgres')
                value = 'postgresql';
            // Normalize oauth2/oauth variations
            if (value.startsWith('oauth'))
                value = 'oauth';
            propositions[propName] = value;
        }
        else {
            propositions[propName] = 'UNKNOWN';
        }
    }
    return propositions;
}
/**
 * Generate clarification questions for a list of unknown propositions.
 * Questions are ordered by Q-value (architectural impact).
 */
function generateClarificationQuestions(unknowns) {
    if (unknowns.length === 0) {
        return [];
    }
    // Sort by Q-value (higher = more important = asked first)
    var sortedUnknowns = __spreadArray([], unknowns, true).sort(function (a, b) {
        var _a, _b;
        var qA = (_a = Q_VALUE_ORDER[a]) !== null && _a !== void 0 ? _a : 10;
        var qB = (_b = Q_VALUE_ORDER[b]) !== null && _b !== void 0 ? _b : 10;
        return qB - qA;
    });
    return sortedUnknowns.map(function (proposition) {
        var _a, _b;
        return ({
            header: toTitleCase(proposition),
            proposition: proposition,
            options: (_a = PROPOSITION_OPTIONS[proposition]) !== null && _a !== void 0 ? _a : ['Other (specify)'],
            why: (_b = PROPOSITION_WHY[proposition]) !== null && _b !== void 0 ? _b : "The ".concat(proposition, " choice impacts the overall architecture and implementation."),
        });
    });
}
/**
 * Format gate status for display (StatusLine format).
 * Returns: "E:X R:O C:->" format where X=check, O=circle, ->=arrow, x=blocked
 */
function formatGateStatus(gates) {
    var statusChars = {
        pass: '\u2713', // checkmark
        block: '\u2717', // X mark
        pending: '\u25CB', // circle
    };
    var eChar = statusChars[gates.erotetic];
    var rChar = statusChars[gates.resources];
    var cChar = statusChars[gates.composition];
    return "E:".concat(eChar, " R:").concat(rChar, " C:").concat(cChar);
}
/**
 * Evaluate the erotetic gate for a prompt.
 * Returns continue/block decision with list of unknowns.
 */
function evaluateEroteticGate(prompt) {
    // Non-implementation tasks always pass
    if (!isImplementationTask(prompt)) {
        return {
            decision: 'continue',
            unknowns: [],
        };
    }
    // Extract propositions
    var propositions = extractPropositions(prompt);
    // Find unknown critical propositions
    var unknowns = CRITICAL_PROPOSITIONS.filter(function (prop) { return propositions[prop] === 'UNKNOWN'; });
    if (unknowns.length === 0) {
        return {
            decision: 'continue',
            unknowns: [],
        };
    }
    // Gate blocks - generate feedback
    var feedback = generateBlockFeedback('Erotetic', unknowns);
    return {
        decision: 'block',
        unknowns: unknowns,
        feedback: feedback,
    };
}
/**
 * Generate structured feedback for a blocked gate (Don Norman principles).
 */
function generateBlockFeedback(gate, unknowns, suggestions) {
    var _a;
    var unknownsList = unknowns.length > 0
        ? unknowns.join(', ')
        : 'general requirements';
    return {
        gate: gate,
        status: 'block',
        title: "Missing ".concat(unknowns.length, " critical proposition(s) to resolve"),
        details: "The following must be clarified before proceeding: ".concat(unknownsList),
        suggestion: (_a = suggestions === null || suggestions === void 0 ? void 0 : suggestions[0]) !== null && _a !== void 0 ? _a : "Please specify the missing values using AskUserQuestion or select from options.",
    };
}
