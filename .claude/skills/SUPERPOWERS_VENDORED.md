# Superpowers — vendored into this repo

The `superpowers` skills in this directory (`brainstorming`, `writing-plans`,
`subagent-driven-development`, `executing-plans`, `test-driven-development`,
`systematic-debugging`, `requesting-code-review`, `receiving-code-review`,
`verification-before-completion`, `using-git-worktrees`,
`dispatching-parallel-agents`, `finishing-a-development-branch`,
`using-superpowers`, `writing-skills`) are **vendored copies**, not a plugin.

## Why vendored instead of installed as a plugin

Claude Code plugins live in the ephemeral `~/.claude/plugins` and do not
reliably load on fresh web/mobile cloud sessions (the project-scoped
`enabledPlugins` install + skill registration doesn't happen early/reliably
enough, and there is no `/plugin` or `/reload-plugins` on web/mobile).

Repo `.claude/skills/` **is part of the git clone**, so the harness loads these
at every session start — the same mechanism that makes the `bmad-*` skills
reliably available. This is the only phone-first-reliable option.

## Source / version

- Upstream: `obra/superpowers-marketplace` → plugin `superpowers`
- Vendored version: **6.1.1**
- Invoke by **bare skill name** (e.g. `brainstorming`), not `superpowers:brainstorming`.
  Internal `superpowers:<name>` cross-references were rewritten to bare names.

## Updating

1. `claude plugin marketplace add obra/superpowers-marketplace`
2. `claude plugin install superpowers@superpowers-marketplace`
3. Copy each folder from
   `~/.claude/plugins/cache/superpowers-marketplace/superpowers/<version>/skills/*`
   into `.claude/skills/`, then rewrite `superpowers:` → ``in the copied`\*.md`.
4. Bump the version above, commit, and merge to `main`.
