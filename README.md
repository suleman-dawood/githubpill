# GithubPill

A Claude Code plugin that checks if your project idea already exists on GitHub before you build it.

```
🟢  No close match
🟡  Adjacent prior art — worth a closer look
🔴  Strong overlap — someone has likely shipped this
```

## Install

> Run these inside the Claude Code chat.

```
/plugin marketplace add suleman-dawood/githubpill
/plugin install githubpill@githubpill
```

> Fully quit and reopen Claude Code so the plugin registers (not `/clear`, you need to actually close the app process).

## Prerequisites

- **gh auth login** — authenticated GitHub CLI session
- gh ≥ 2.55
- jq ≥ 1.7
- **WebSearch tool must be enabled** in your Claude Code session
- macOS: `brew install bash coreutils (GNU timeout + bash` ≥ 4)

Verify:

```
gh auth status && gh --version && jq --version
```

Use:

```
/githubpill I want to build a CLI that previews diffs as a side-by-side TUI
```

Or just describe an idea naturally in chat:

- "is there already a tool that does X"
- "validate my idea before I start building"

You get a verdict in 60 seconds. If it's 🟡 or 🔴, you can go for a deep search to clone the top candidates and get file-path-cited evidence (~5 min).

Reports land in `./githubpill-reports/YYYY-MM-DD-<slug>.md`. One file per idea.

## pi support

GithubPill also runs inside [pi](https://github.com/badlogic/pi), which
implements the same Agent Skills standard. The protocol is one canonical
skill (`skills/githubpill/`); only the execution surfaces differ (pi has no
PreToolUse hooks or Task tool, so the port ships equivalents as extensions).

```bash
bash pi/install.sh        # symlinks skill + extensions + judge agent into ~/.pi
# restart pi, or run /reload
```

Use it the same way — `/skill:githubpill <idea>` or just describe an idea.
Deep search parallelizes its per-candidate judges via a `subagent` tool and
the `githubpill-judge` agent; clone safety is enforced by a bash spawn-hook
extension that runs the same contract as the Claude Code hook. See
[`pi/README.md`](pi/README.md) for the full mapping and tests.

## Limitations

- **GitHub-only.** GitLab, Codeberg, self-hosted forges, and package-registry-only tools are not searched currently.
- **Verify before you decide.** GithubPill narrows the search; it doesn't replace you making the final call yourself before you commit to a project.

## License

MIT :0 <- proof im human
