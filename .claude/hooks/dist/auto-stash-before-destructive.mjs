// src/auto-stash-before-destructive.ts
import { execSync } from "child_process";
var DESTRUCTIVE_PATTERNS = [
  /\b(mv|rm)\s+.*\/(src|services|lib|components|app)\b/,
  /\brm\s+-rf?\s+/,
  /\bmv\s+.*\.(ts|tsx|js|jsx|json)\b/,
  /\bgit\s+(reset|checkout)\s+--hard/,
  /\bgit\s+clean\s+-[fd]/
];
function hasUncommittedChanges(dir) {
  try {
    const status = execSync("git status --porcelain 2>/dev/null", {
      cwd: dir,
      encoding: "utf-8",
      timeout: 5e3
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}
function autoStash(dir, reason) {
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const message = `auto-backup ${timestamp}: before ${reason.slice(0, 50)}`;
    execSync(`git stash push -m "${message}"`, {
      cwd: dir,
      encoding: "utf-8",
      timeout: 1e4
    });
    return true;
  } catch (err) {
    console.error(`[auto-stash] Failed to stash in ${dir}:`, err.message);
    return false;
  }
}
function isDestructiveCommand(command) {
  return DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(command));
}
async function onPreToolUse(input) {
  if (input.tool_name !== "Bash") {
    return { result: "continue" };
  }
  const command = input.tool_input?.command || "";
  if (!isDestructiveCommand(command)) {
    return { result: "continue" };
  }
  const worktreeDir = process.env.SWARM_WORKTREE_DIR || process.cwd();
  let stashed = false;
  let stashMessage = "";
  if (hasUncommittedChanges(worktreeDir)) {
    const success = autoStash(worktreeDir, command);
    if (success) {
      stashed = true;
      stashMessage = `[auto-stash] Stashed uncommitted changes in ${worktreeDir}
`;
    }
  }
  if (stashed) {
    return {
      result: "continue",
      message: stashMessage + "Proceeding with command. Use `git stash list` to see backups."
    };
  }
  return { result: "continue" };
}
export {
  onPreToolUse
};
