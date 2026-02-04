"use strict";
/**
 * Project State Management
 *
 * Tracks project-level state that's shared across all sessions.
 * Used for passing context to forked skills.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectStatePath = getProjectStatePath;
exports.loadProjectState = loadProjectState;
exports.saveProjectState = saveProjectState;
exports.setActivePlan = setActivePlan;
exports.setActiveSpec = setActiveSpec;
exports.findLatestFile = findLatestFile;
exports.getActivePlanOrLatest = getActivePlanOrLatest;
exports.getActiveSpecOrLatest = getActiveSpecOrLatest;
var fs_1 = require("fs");
var path_1 = require("path");
var PROJECT_STATE_VERSION = '1.0';
function getProjectStatePath(projectDir) {
    return (0, path_1.join)(projectDir, '.claude', 'cache', 'project-state.json');
}
function loadProjectState(projectDir) {
    var path = getProjectStatePath(projectDir);
    if ((0, fs_1.existsSync)(path)) {
        try {
            return JSON.parse((0, fs_1.readFileSync)(path, 'utf-8'));
        }
        catch (_a) {
            // Corrupted file, start fresh
        }
    }
    return {
        version: PROJECT_STATE_VERSION,
        activePlan: null,
        activeSpec: null,
        updatedAt: new Date().toISOString()
    };
}
function saveProjectState(projectDir, state) {
    var path = getProjectStatePath(projectDir);
    var dir = (0, path_1.dirname)(path);
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    state.updatedAt = new Date().toISOString();
    (0, fs_1.writeFileSync)(path, JSON.stringify(state, null, 2));
}
function setActivePlan(projectDir, planPath) {
    var state = loadProjectState(projectDir);
    state.activePlan = planPath;
    saveProjectState(projectDir, state);
}
function setActiveSpec(projectDir, specPath) {
    var state = loadProjectState(projectDir);
    state.activeSpec = specPath;
    saveProjectState(projectDir, state);
}
/**
 * Find the latest file in a directory matching a pattern.
 * Uses filename timestamps (YYYY-MM-DD) or mtime as fallback.
 */
function findLatestFile(dir, pattern) {
    if (pattern === void 0) { pattern = /\.md$/; }
    if (!(0, fs_1.existsSync)(dir))
        return null;
    try {
        var files = (0, fs_1.readdirSync)(dir)
            .filter(function (f) { return pattern.test(f); })
            .map(function (f) {
            var fullPath = (0, path_1.join)(dir, f);
            var stat = (0, fs_1.statSync)(fullPath);
            // Try to extract date from filename (YYYY-MM-DD format)
            var dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
            var fileDate = dateMatch ? new Date(dateMatch[1]).getTime() : stat.mtimeMs;
            return { path: fullPath, date: fileDate };
        })
            .sort(function (a, b) { return b.date - a.date; });
        return files.length > 0 ? files[0].path : null;
    }
    catch (_a) {
        return null;
    }
}
/**
 * Get the active plan, falling back to the latest plan file.
 */
function getActivePlanOrLatest(projectDir) {
    var state = loadProjectState(projectDir);
    if (state.activePlan && (0, fs_1.existsSync)(state.activePlan)) {
        return state.activePlan;
    }
    // Fallback: find latest plan
    var planDirs = [
        (0, path_1.join)(projectDir, 'thoughts', 'shared', 'plans'),
        (0, path_1.join)(projectDir, 'plans'),
        (0, path_1.join)(projectDir, 'specs')
    ];
    for (var _i = 0, planDirs_1 = planDirs; _i < planDirs_1.length; _i++) {
        var dir = planDirs_1[_i];
        var latest = findLatestFile(dir);
        if (latest)
            return latest;
    }
    return null;
}
/**
 * Get the active spec, falling back to the latest spec file.
 */
function getActiveSpecOrLatest(projectDir) {
    var state = loadProjectState(projectDir);
    if (state.activeSpec && (0, fs_1.existsSync)(state.activeSpec)) {
        return state.activeSpec;
    }
    // Fallback: find latest spec
    var specDirs = [
        (0, path_1.join)(projectDir, 'thoughts', 'shared', 'specs'),
        (0, path_1.join)(projectDir, 'specs')
    ];
    for (var _i = 0, specDirs_1 = specDirs; _i < specDirs_1.length; _i++) {
        var dir = specDirs_1[_i];
        var latest = findLatestFile(dir);
        if (latest)
            return latest;
    }
    return null;
}
