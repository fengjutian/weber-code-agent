[English](./README.md) | [简体中文](./README.zh-CN.md)

# weber

A hackable CLI coding agent built with TypeScript, OpenAI SDK, and Ink. Works in your terminal, streams output, executes tools in your workspace, and supports tasks, skills, MCP integration, and multi-agent collaboration.

**Small enough to read end-to-end. Opinionated enough to be useful daily.**

---

## Quick Start

### Install

```bash
npm install -g weber-code-agent
```

Or run locally:

```bash
npm install
npm run dev
```

### Configure

Create `~/.weber/settings.json`:

```json
{
  "providers": {
    "openai": {
      "models": ["gpt-4.1"],
      "apiKey": "YOUR_OPENAI_API_KEY",
      "baseURL": "https://api.openai.com/v1",
      "apiMode": "responses"
    }
  },
  "defaultProvider": "openai",
  "showThinking": false
}
```

### Run

```bash
weber
```

Or locally:

```bash
npm start
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Dual API** | OpenAI Responses API and Chat Completions API |
| **File & Shell Tools** | Sandboxed to current workspace |
| **Persistent Tasks** | File-backed task board in `.tasks/` |
| **Skills System** | Global + repo-local skill loading |
| **MCP Integration** | Dynamic tool exposure, prompts, and resources |
| **Team Mode** | Persistent teammates with inbox-based messaging |
| **Context Compaction** | Automatic history summarization |
| **ESM TypeScript** | Small, readable codebase |

---

## How It Works

weber runs a standard think-act loop:

1. Build system prompt from skills, MCP instructions, and optional `AGENTS.md`
2. Send turn to the model
3. Stream output to the terminal UI
4. Execute tool calls when requested
5. Feed results back to the model
6. Repeat until done

**Responses API** — chains turns via `previous_response_id`, periodic chain reset to cap growth

**Chat Completions** — maintains local message history, compacts when token limits approach
---

## Commands

### Slash Commands

- `/help` — show help
- `/status` — system status
- `/login` `/logout` — OAuth login
- `/mcp` — MCP server management
- `/team` — team management
- `/inbox` — view messages
- `/provider` `/model` — switch provider/model
- `/compact` — force compaction
- `/new` — new conversation
- `/exit` — exit

### Built-in Tools

**Lead agent:** `bash`, `read_file`, `write_file`, `edit_file`, `task_*`, `mcp_*`, `skill_*`, `message_send`, `teammate_*`

**Teammates:** base tools + `message_send` only (intentionally limited)

---

## Tasks

Persistent tasks stored in `.tasks/task_<id>.json`.

Statuses: `pending` → `in_progress` → `completed`

When a task completes, its blockers are automatically unblocked.

---

## Skills

Loaded from three locations (in order):

1. `~/.weber/skills` — global (loaded first)
2. `~/.claude/skills` — global Claude-compatible
3. `<workdir>/skills` — local (loaded last, overrides)

Each skill is a `SKILL.md` with frontmatter. Example skills in `skills/pdf/` and `skills/code-review/`.

Each skill is defined by a `SKILL.md` file with frontmatter. The loader exposes:

- skill descriptions for prompt construction
- prompt commands
- rendered skill content via `load_skill`

Two example local skills ship in this repo:

- `skills/pdf/SKILL.md`
- `skills/code-review/SKILL.md`

### MCP

MCP server configuration lives in:

```bash
~/.weber/settings.json
```

Supported transports:

- `stdio`
- `streamable-http`

Example:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "filesystem",
        "enabled": true,
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
        "cwd": "/path/to/project",
        "timeoutMs": 30000
      }
    ]
  }
}
```

Current MCP behavior:

- MCP servers are initialized through a shared runtime manager
- MCP tools are dynamically surfaced as normal function tools
- MCP resources can be discovered with `list_mcp_resources`
- Cached resources can be read with `read_mcp_resource`
- MCP prompts are retrieved through `mcp_call`

For deeper details, see:

- [docs/mcp-overview.md](./docs/mcp-overview.md)
- [docs/mcp-implementation.md](./docs/mcp-implementation.md)
- [docs/mcp-config.md](./docs/mcp-config.md)

### Team mode

`weber` supports persistent teammates instead of only one-shot sub-agents.

Conceptually:

- `lead` is the main CLI-facing agent
- teammates are long-lived worker agents with names and roles
- coordination happens through append-only inbox files

Team state is stored under:

```bash
.team/
  config.json
  inbox/
    lead.jsonl
    <teammate>.jsonl
```

Useful tools:

- `teammate_spawn`
- `teammate_list`
- `teammate_shutdown`
- `message_send`
- `lead_inbox`

This model supports asynchronous collaboration while keeping contexts isolated per agent.

For the design background, see [docs/agent-teams.md](./docs/agent-teams.md).

## Developer Guide

### Project layout

```text
code-agent/
  src/
    index.tsx              CLI UI and input loop
    agent.ts               core agent loop
    tools.ts               tool definitions and handlers
    config.ts              settings loading and provider resolution
    prompt.ts              system prompt construction
    compact.ts             context compaction logic
    task-manager.ts        persistent task storage
    message-bus.ts         inbox-based messaging
    teammate-manager.ts    persistent teammate lifecycle
    mcp/                   MCP runtime, manager, client, types
    skills/                skill parsing and rendering
  test/                    node:test test suite
  docs/                    design and implementation notes
  skills/                  example local skills
  scripts/postinstall.mjs  default config bootstrap
```

### Core modules

#### `src/index.tsx`

Responsible for:

- terminal UI rendering through Ink
- input handling
- provider/model selection
- slash command dispatch
- bridge from streaming agent events into the UI

#### `src/agent.ts`

Responsible for:

- main turn orchestration
- tool/runtime preparation
- Responses API loop
- Chat Completions loop
- interruption handling
- context compaction triggers
- teammate runtime behavior

#### `src/tools.ts`

Responsible for:

- tool schemas
- tool permission boundaries
- local file and shell handlers
- task and team operations
- skill loading bridge
- MCP entry points

#### `src/config.ts`

Responsible for:

- reading `~/.weber/settings.json`
- normalizing provider settings
- selecting models
- validating and normalizing MCP server configs

#### `src/prompt.ts`

Responsible for building the static system prompt from:

- workdir
- available skill descriptions
- MCP prompt instructions
- optional project-level `AGENTS.md`

#### `src/compact.ts`

Implements two levels of history control:

- `microCompact`
  Shrinks old tool outputs in local chat history
- `autoCompact`
  Summarizes history and replaces it with a compressed summary

Responses mode uses a different strategy: periodic reset of the `previous_response_id` chain.

### API modes

#### Responses API mode

Best fit for:

- OpenAI-native models
- simpler server-side context chaining

Behavior:

- chains turns through `previous_response_id`
- periodically resets the chain to cap growth
- does not maintain the same local history structure as chat mode

#### Chat Completions mode

Best fit for:

- compatible non-OpenAI endpoints
- providers that only expose chat-completions style APIs

Behavior:

- stores local message history
- compacts history when token estimates cross thresholds
- supports tool-loop behavior through standard tool calls

### Sub-agents vs teammates

There are two delegation models:

- `task`
  Creates a one-shot isolated sub-agent with a clean context and a bounded maximum round count
- teammates
  Persistent workers with identities, inboxes, statuses, and wake/sleep lifecycle

Use `task` for isolated execution. Use teammates for ongoing coordination.

### Testing

Run the test suite with:

```bash
npm test
```

Current tests cover areas such as:

- input submit deduplication
- prompt building
- skill loading and rendering
- utility behavior

The test runner uses native `node:test` with `tsx`.

### Publishing

The package is published as:

```text
@lwmxiaobei/weber
```

Important package details:

- binary name: `weber`
- module format: ESM
- build output: `dist/`
- `prepublishOnly` runs build plus tests

## Design Notes and Trade-offs

### Safety boundaries

The current implementation intentionally enforces several simple constraints:

- file access is restricted to the current workspace through `safePath()`
- shell commands have a timeout
- very dangerous shell snippets are blocked
- tool output is truncated to avoid blowing up context size
- teammate tool permissions are narrower than lead permissions

This is not a hardened sandbox. It is a pragmatic local-agent safety layer.

### Why the project stays small

The codebase favors:

- direct composition over deep abstractions
- file-backed persistence over databases
- explicit modules over framework-heavy orchestration
- readable control flow over maximum generality

That makes it easier to understand, modify, and compare against larger agent implementations.

### Current limitations

Notable limitations in the current implementation:

- no git worktree isolation for teammates or sub-agents
- no long-lived scheduler beyond teammate wake/sleep behavior
- dangerous command filtering is intentionally simple, not exhaustive
- Responses API compaction is a chain reset, not a summary-preserving merge
- teammate execution is intentionally capability-limited

## Documentation

Additional project notes live under `docs/`:

- [docs/TUTORIAL.md](./docs/TUTORIAL.md)
- [docs/task-dag.md](./docs/task-dag.md)
- [docs/context-compaction.md](./docs/context-compaction.md)
- [docs/mcp-plan.md](./docs/mcp-plan.md)
- [docs/mcp-overview.md](./docs/mcp-overview.md)
- [docs/mcp-implementation.md](./docs/mcp-implementation.md)
- [docs/mcp-config.md](./docs/mcp-config.md)
- [docs/agent-teams.md](./docs/agent-teams.md)

## Development

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

## License

No license file is included in this repository snapshot. Add one before public redistribution if needed.
