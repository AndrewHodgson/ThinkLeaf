# Codex Prompt Template

Use `project-vision.md`, `notes/current-status.md`, and the files in `codex/` as context.

## Task

[Describe the specific task here.]

## Requirements

- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Must Preserve

Follow `codex/guardrails.md`.

## Do Not Add

Do not add features outside this task.

## Verification

- Run `npm.cmd run build`
- Fix any TypeScript/build errors
- Confirm localStorage behavior is preserved where relevant

## Response Format

After completing the task, summarize:

1. Files changed
2. What changed
3. What works now
4. Build status
5. Remaining issues
6. Recommended next step