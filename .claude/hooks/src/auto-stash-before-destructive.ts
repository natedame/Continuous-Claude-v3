/**
 * Auto-Stash Before Destructive Operations
 *
 * This hook automatically stashes uncommitted git changes before
 * destructive file operations (mv, rm, cp) to prevent data loss.
 *
 * Created after incident where status-dashboard changes were lost
 * during a file move operation on 2026-02-02.
 */

import { execSync } from 'child_process';

// Patterns that indicate destructive file operations on source code
const DESTRUCTIVE_PATTERNS = [
  /\b(mv|rm)\s+.*\/(src|services|lib|components|app)\b/,
  /\brm\s+-rf?\s+/,
  /\bmv\s+.*\.(ts|tsx|js|jsx|json)\b/,
  /\bgit\s+(reset|checkout)\s+--hard/,
  /\bgit\s+clean\s+-[fd]/,
];

interface HookInput {
  tool_name: string;
  tool_input?: {
    command?: string;
  };
}

interface HookResult {
  result: 'continue' | 'block';
  message?: string;
}

function hasUncommittedChanges(dir: string): boolean {
  try {
    const status = execSync('git status --porcelain 2>/dev/null', {
      cwd: dir,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function autoStash(dir: string, reason: string): boolean {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const message = `auto-backup ${timestamp}: before ${reason.slice(0, 50)}`;
    execSync(`git stash push -m "${message}"`, {
      cwd: dir,
      encoding: 'utf-8',
      timeout: 10000,
    });
    return true;
  } catch (err) {
    console.error(`[auto-stash] Failed to stash in ${dir}:`, (err as Error).message);
    return false;
  }
}

function isDestructiveCommand(command: string): boolean {
  return DESTRUCTIVE_PATTERNS.some(pattern => pattern.test(command));
}

export async function onPreToolUse(input: HookInput): Promise<HookResult> {
  // Only process Bash tool calls
  if (input.tool_name !== 'Bash') {
    return { result: 'continue' };
  }

  const command = input.tool_input?.command || '';

  // Check if command is destructive
  if (!isDestructiveCommand(command)) {
    return { result: 'continue' };
  }

  // Get the worktree directory from environment
  const worktreeDir = process.env.SWARM_WORKTREE_DIR || process.cwd();

  // Check for uncommitted changes and stash if present
  let stashed = false;
  let stashMessage = '';

  if (hasUncommittedChanges(worktreeDir)) {
    const success = autoStash(worktreeDir, command);
    if (success) {
      stashed = true;
      stashMessage = `[auto-stash] Stashed uncommitted changes in ${worktreeDir}\n`;
    }
  }

  if (stashed) {
    return {
      result: 'continue',
      message: stashMessage + 'Proceeding with command. Use `git stash list` to see backups.',
    };
  }

  return { result: 'continue' };
}
