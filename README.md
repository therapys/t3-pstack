# t3-pstack

pstack for [T3 Code](https://github.com/pingdotgg/t3code), with **Claude Code, Codex, and Pi harness support**. It is Lauren Tan's (poteto's) [pstack](https://github.com/cursor/plugins/tree/main/pstack), with its Cursor mechanics rewritten for T3. Subagents, panels, schedules, and PR watches dispatch through T3's orchestration tools, so reviewers can run different models side by side.

This public fork adds Pi packaging and routing to [chhoumann/t3-pstack](https://github.com/chhoumann/t3-pstack). Original licenses and credits are retained. **T3 Code is required**; this is not a standalone Pi orchestration package.

## Install with Pi inside T3 Code

1. Install and authenticate [Pi](https://pi.dev) on the machine running the T3 Code server. Use a T3 build with [native Pi support](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-pi.md).
2. Install this package on that same machine:

   ```shell
   pi install git:github.com/therapys/t3-pstack@v2.0.0-pi.1
   ```

3. In T3 Code Settings, enable Pi and refresh the provider. Start a fresh Pi thread. Installed skills appear in T3's `$` menu.
4. Select `setup-pstack` from that menu, or ask: `Use setup-pstack to configure my T3 models.` In Pi's terminal, its native command is `/skill:setup-pstack`.

The Pi extension supplies the session routing instructions when T3's orchestration tools are present. Delegation uses T3's `delegate_task` bridge, not Pi's local subagent extension, so child threads remain durable and visible in T3. Outside T3, the extension does nothing; do not use these T3-specific skills there.

Pi's model sheet is `$PI_CODING_AGENT_DIR/t3-pstack-models.md`, defaulting to `~/.pi/agent/t3-pstack-models.md`. Set `session hook: off` in it to disable automatic routing. Configure roles from T3's live `orchestrator_capabilities`, including Pi targets and their supported options; never assume the bundled Claude/Codex/Grok defaults exist on your machine.

Review package code before installing: Pi extensions execute locally. Project-local installs and extensions also follow Pi's project trust rules. T3 must run Pi with the same agent directory where you installed the package.

## Install with Claude Code or Codex

| | Claude Code | Codex |
| --- | --- | --- |
| Plugin id | `t3-pstack@t3-pstack` | `t3-pstack@t3-pstack` |
| Marketplace repo | `therapys/t3-pstack` | `therapys/t3-pstack` |

```shell
claude plugin marketplace add therapys/t3-pstack && claude plugin install t3-pstack@t3-pstack
codex plugin marketplace add therapys/t3-pstack && codex plugin add t3-pstack@t3-pstack
```

Codex runs a plugin's session-start hook only after you trust it through `/hooks` in the Codex CLI. Run `/t3-pstack:setup-pstack` in a T3 thread on each machine. The sheet lives in `$CLAUDE_CONFIG_DIR` or `~/.claude` on Claude Code, and `$CODEX_HOME` or `~/.codex` on Codex.

## Use

```text
Use poteto-mode to fix the search filter resetting when I change pages.
```

Automatic routing applies to work that touches more than one file, a design choice, or a bug whose cause is unknown. `poteto-mode` chooses a playbook and opens the other bundled skills. Invoke skills from T3's menu or by name; Pi also supports `/skill:<name>`.

The plugin carries 62 skill directories, 24 of them `principle-*` leaves, and 4 agents.

## Staying current

The skills are synced against upstream `1e5c90a`. `tools/upstream.json` pins each component, `tools/substitutions.json` holds the Cursor-to-T3 rewrite rules, and `tools/forks.json` declares files kept in their own form. `bun tools/sync.mjs <component> <sha>` derives upstream files through the rules and checks the sync boundary. [CONTRIBUTING.md](CONTRIBUTING.md#the-sync-boundary) has the details.

## Data handling

This package has no server or telemetry. Anything its skills ask your agent to read, including session transcripts, goes to your model provider. Scripts run locally; PR tools use your GitHub CLI login.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for checks and the sync boundary, and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

[MIT](LICENSE). Original T3 modifications are © 2026 Christian Bager Bach Houmann. This fork builds on:

- [pstack](https://github.com/cursor/plugins/tree/main/pstack), MIT, © 2026 Lauren Tan (poteto).
- [t3-pstack](https://github.com/chhoumann/t3-pstack), MIT, © 2026 Christian Bager Bach Houmann.
- [pstack-claude](https://github.com/michael-denyer/pstack-claude), MIT, © 2026 Michael Denyer.
- [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit), MIT, © 2026 Cursor. See [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit).
- [thermos](https://github.com/cursor/plugins/tree/main/thermos), MIT, © 2026 Cursor. See [LICENSE-thermos](LICENSE-thermos).

[NOTICE.md](NOTICE.md) lists the upstream components and license files.
