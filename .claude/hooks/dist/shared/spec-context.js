"use strict";
/**
 * Spec Context Management
 *
 * Shared utilities for managing spec-context.json - the central state
 * that tracks which spec/phase each session is implementing.
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
exports.getSpecContextPath = getSpecContextPath;
exports.loadSpecContext = loadSpecContext;
exports.saveSpecContext = saveSpecContext;
exports.getSessionContext = getSessionContext;
exports.createEmptySessionContext = createEmptySessionContext;
exports.setSessionSpec = setSessionSpec;
exports.setSessionPhase = setSessionPhase;
exports.registerAgent = registerAgent;
exports.unregisterAgent = unregisterAgent;
exports.incrementEditCount = incrementEditCount;
exports.clearSession = clearSession;
exports.findSpecFile = findSpecFile;
exports.extractSpecRequirements = extractSpecRequirements;
exports.extractAcceptanceCriteria = extractAcceptanceCriteria;
var fs_1 = require("fs");
var path_1 = require("path");
var SPEC_CONTEXT_VERSION = '1.0';
var CHECKPOINT_INTERVAL = 5;
function getSpecContextPath(projectDir) {
    return (0, path_1.join)(projectDir, '.claude', 'cache', 'spec-context.json');
}
function loadSpecContext(projectDir) {
    var path = getSpecContextPath(projectDir);
    if ((0, fs_1.existsSync)(path)) {
        try {
            return JSON.parse((0, fs_1.readFileSync)(path, 'utf-8'));
        }
        catch (_a) {
            // Corrupted file, start fresh
        }
    }
    return { version: SPEC_CONTEXT_VERSION, sessions: {} };
}
function saveSpecContext(projectDir, context) {
    var path = getSpecContextPath(projectDir);
    var dir = (0, path_1.dirname)(path);
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    (0, fs_1.writeFileSync)(path, JSON.stringify(context, null, 2));
}
function getSessionContext(projectDir, sessionId) {
    var context = loadSpecContext(projectDir);
    return context.sessions[sessionId] || null;
}
function createEmptySessionContext() {
    return {
        active_spec: null,
        current_phase: null,
        activated_at: new Date().toISOString(),
        edit_count: 0,
        last_checkpoint: 0,
        agents: {}
    };
}
function setSessionSpec(projectDir, sessionId, specPath, phase) {
    var context = loadSpecContext(projectDir);
    var existing = context.sessions[sessionId] || createEmptySessionContext();
    context.sessions[sessionId] = __assign(__assign({}, existing), { active_spec: specPath, current_phase: phase || existing.current_phase, activated_at: new Date().toISOString(), edit_count: 0, last_checkpoint: 0 });
    saveSpecContext(projectDir, context);
}
function setSessionPhase(projectDir, sessionId, phase) {
    var context = loadSpecContext(projectDir);
    if (context.sessions[sessionId]) {
        context.sessions[sessionId].current_phase = phase;
        saveSpecContext(projectDir, context);
    }
}
function registerAgent(projectDir, sessionId, parentSessionId, scope) {
    var context = loadSpecContext(projectDir);
    // Find parent's spec context
    var parentContext = parentSessionId ? context.sessions[parentSessionId] : null;
    // Create agent's session entry
    context.sessions[sessionId] = {
        active_spec: (parentContext === null || parentContext === void 0 ? void 0 : parentContext.active_spec) || null,
        current_phase: scope.section,
        activated_at: new Date().toISOString(),
        edit_count: 0,
        last_checkpoint: 0,
        agents: {}
    };
    // Also register in parent's agents list if parent exists
    if (parentSessionId && context.sessions[parentSessionId]) {
        context.sessions[parentSessionId].agents[sessionId] = __assign(__assign({}, scope), { registered_at: new Date().toISOString(), parent_session: parentSessionId });
    }
    saveSpecContext(projectDir, context);
}
function unregisterAgent(projectDir, sessionId) {
    var context = loadSpecContext(projectDir);
    // Find and remove from parent's agents list
    for (var _i = 0, _a = Object.entries(context.sessions); _i < _a.length; _i++) {
        var _b = _a[_i], parentId = _b[0], session = _b[1];
        if (session.agents[sessionId]) {
            delete session.agents[sessionId];
        }
    }
    // Remove the session itself
    delete context.sessions[sessionId];
    saveSpecContext(projectDir, context);
}
function incrementEditCount(projectDir, sessionId) {
    var context = loadSpecContext(projectDir);
    var session = context.sessions[sessionId];
    if (!session) {
        return { count: 0, needsCheckpoint: false };
    }
    session.edit_count++;
    var editsSinceCheckpoint = session.edit_count - session.last_checkpoint;
    var needsCheckpoint = editsSinceCheckpoint >= CHECKPOINT_INTERVAL;
    if (needsCheckpoint) {
        session.last_checkpoint = session.edit_count;
    }
    saveSpecContext(projectDir, context);
    return { count: session.edit_count, needsCheckpoint: needsCheckpoint };
}
function clearSession(projectDir, sessionId) {
    var context = loadSpecContext(projectDir);
    delete context.sessions[sessionId];
    saveSpecContext(projectDir, context);
}
// Spec file utilities
function findSpecFile(projectDir, specName) {
    var specDirs = [
        (0, path_1.join)(projectDir, 'thoughts', 'shared', 'specs'),
        (0, path_1.join)(projectDir, 'thoughts', 'shared', 'plans'),
        (0, path_1.join)(projectDir, 'specs'),
        (0, path_1.join)(projectDir, 'plans')
    ];
    for (var _i = 0, specDirs_1 = specDirs; _i < specDirs_1.length; _i++) {
        var dir = specDirs_1[_i];
        if (!(0, fs_1.existsSync)(dir))
            continue;
        var files = (0, fs_1.readdirSync)(dir);
        // Exact match first
        var exact = files.find(function (f) { return f === specName || f === "".concat(specName, ".md"); });
        if (exact)
            return (0, path_1.join)(dir, exact);
        // Partial match
        var partial = files.find(function (f) {
            return f.toLowerCase().includes(specName.toLowerCase()) && f.endsWith('.md');
        });
        if (partial)
            return (0, path_1.join)(dir, partial);
    }
    // Check if it's already a full path
    if (specName.endsWith('.md') && (0, fs_1.existsSync)((0, path_1.join)(projectDir, specName))) {
        return (0, path_1.join)(projectDir, specName);
    }
    return null;
}
function extractSpecRequirements(specContent, section) {
    // If a section is specified, extract just that section
    if (section) {
        var sectionRegex = new RegExp("## ".concat(section, "[\\s\\S]*?(?=\\n## |$)"), 'i');
        var match = specContent.match(sectionRegex);
        if (match) {
            return extractCriteria(match[0]);
        }
    }
    // Otherwise extract key sections
    return extractCriteria(specContent);
}
function extractCriteria(content) {
    var sections = [
        '## Requirements',
        '## Functional Requirements',
        '## Must Have',
        '## Success Criteria',
        '## Acceptance Criteria',
        '### Success Criteria',
        '### Acceptance Criteria'
    ];
    var extracted = [];
    for (var _i = 0, sections_1 = sections; _i < sections_1.length; _i++) {
        var section = sections_1[_i];
        var regex = new RegExp("".concat(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "[\\s\\S]*?(?=\\n## |\\n### |$)"), 'i');
        var match = content.match(regex);
        if (match) {
            extracted.push(match[0].slice(0, 600));
        }
    }
    // Also extract checkbox items
    var checkboxes = content.match(/- \[ \] .+/g) || [];
    if (checkboxes.length > 0) {
        extracted.push('Acceptance Criteria:\n' + checkboxes.slice(0, 10).join('\n'));
    }
    if (extracted.length > 0) {
        return extracted.join('\n\n').slice(0, 1500);
    }
    // Fallback: first 800 chars
    return content.slice(0, 800);
}
function extractAcceptanceCriteria(specContent, section) {
    var content = section
        ? extractSpecRequirements(specContent, section)
        : specContent;
    var criteria = [];
    // Checkbox items
    var checkboxes = content.match(/- \[ \] .+/g) || [];
    criteria.push.apply(criteria, checkboxes);
    // Numbered items in success/acceptance sections
    var numbered = content.match(/^\d+\.\s+.+$/gm) || [];
    criteria.push.apply(criteria, numbered);
    return __spreadArray([], new Set(criteria), true).slice(0, 15);
}
