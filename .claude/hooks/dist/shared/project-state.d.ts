/**
 * Project State Management
 *
 * Tracks project-level state that's shared across all sessions.
 * Used for passing context to forked skills.
 */
export interface ProjectState {
    version: string;
    activePlan: string | null;
    activeSpec: string | null;
    updatedAt: string;
}
export declare function getProjectStatePath(projectDir: string): string;
export declare function loadProjectState(projectDir: string): ProjectState;
export declare function saveProjectState(projectDir: string, state: ProjectState): void;
export declare function setActivePlan(projectDir: string, planPath: string | null): void;
export declare function setActiveSpec(projectDir: string, specPath: string | null): void;
/**
 * Find the latest file in a directory matching a pattern.
 * Uses filename timestamps (YYYY-MM-DD) or mtime as fallback.
 */
export declare function findLatestFile(dir: string, pattern?: RegExp): string | null;
/**
 * Get the active plan, falling back to the latest plan file.
 */
export declare function getActivePlanOrLatest(projectDir: string): string | null;
/**
 * Get the active spec, falling back to the latest spec file.
 */
export declare function getActiveSpecOrLatest(projectDir: string): string | null;
