# validate-plan

Validates a PLAN.md before implementation begins. Catches structural issues that cause implementation failures, skipped work, and untestable features.

## When to Use

- Called automatically by `implement_plan` before premortem
- Can be invoked standalone: `/validate-plan` or `/validate-plan path/to/PLAN.md`

## What It Checks

### 1. Acceptance Criteria (CRITICAL)
Every checklist item (`- [ ]`) must have explicit, verifiable acceptance criteria — not vague descriptions.

**FAIL examples:**
- `- [ ] Add search functionality`
- `- [ ] Improve the UI`
- `- [ ] Handle errors properly`

**PASS examples:**
- `- [ ] Add search input to header that filters content list by title (case-insensitive)`
- `- [ ] Show error toast when API returns 4xx/5xx, with retry button`

**Check:** Flag any checklist item under 10 words or containing only a verb + noun without specifics.

### 2. Granularity — No Compound Steps
Plan items should be single-feature granularity. Compound steps (containing "and", "also", "plus", or multiple distinct actions) get skipped or half-done.

**FAIL examples:**
- `- [ ] Add search bar and filter dropdown`
- `- [ ] Create the API endpoint, add validation, and write tests`

**PASS examples:**
- `- [ ] Add search bar to header`
- `- [ ] Add filter dropdown below search bar`

**Check:** Flag items containing " and " or " also " that describe distinct features. Items like "drag and drop" are fine (single concept).

### 3. Testability
All plan items should be browser-testable by the testing agent (Playwright-based). If an item cannot be verified via browser automation, it must note an alternative verification method.

**FAIL examples:**
- `- [ ] Refactor the state management` (no observable change)
- `- [ ] Optimize database queries` (no browser-visible effect)

**PASS examples:**
- `- [ ] Refactor state management (verify: page still renders content list correctly after refactor)`
- `- [ ] Optimize queries (verify: page load time under 3s visible in network tab)`

**Check:** Flag items that describe internal-only changes without observable verification criteria.

### 4. Parallel Safety
If the plan uses parallel execution (multiple tasks running simultaneously), verify no two parallel tasks modify the same file.

**Check:** For each file listed in "Files to modify" across parallel tasks, flag conflicts.

### 5. Steady-State Assertions
Plan items that CHANGE existing behavior (not add new) should assert what should remain unchanged.

**FAIL example:**
- `- [ ] Change the header layout to use flexbox`

**PASS example:**
- `- [ ] Change header layout to flexbox (preserve: logo left-aligned, nav right-aligned, mobile responsive)`

**Check:** Flag items containing "change", "refactor", "replace", "migrate", "update" without a "(preserve: ...)" or "(unchanged: ...)" note.

## Output Format

```
PLAN VALIDATION RESULTS
=======================

Status: PASS | NEEDS REVISION

Issues Found: N

[CRITICAL] Vague acceptance criteria
  Line: "- [ ] Add search functionality"
  Fix: Specify what search does, where it appears, and how results display

[WARNING] Compound step detected
  Line: "- [ ] Create API endpoint and add validation"
  Fix: Split into separate checklist items

[WARNING] Not browser-testable
  Line: "- [ ] Optimize database queries"
  Fix: Add verification criteria: "(verify: page loads in <3s)"

[INFO] Parallel file conflict
  Files: src/components/Header.tsx
  Tasks: Task 2 and Task 4 both modify this file
  Fix: Make one task depend on the other, or merge into same task

Summary:
- Acceptance criteria: 8/10 items pass
- Granularity: 9/10 items pass
- Testability: 7/10 items pass
- Parallel safety: No conflicts
- Steady-state: 2 items need preservation notes
```

## How It Works

1. Read the plan file (default: `.claude/PLAN.md`, or path argument)
2. Extract all checklist items (`- [ ]` and `- [x]`)
3. Run each check against every item
4. Report findings grouped by severity: CRITICAL > WARNING > INFO
5. Return status: PASS (no criticals) or NEEDS REVISION (has criticals)

## Integration with implement_plan

When called from `implement_plan`:
- If PASS: proceed to premortem
- If NEEDS REVISION: present findings and ask user to fix plan before continuing
- User can override with "skip validation" to proceed anyway
