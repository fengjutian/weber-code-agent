[English](./README.md) | [简体中文](./README.zh-CN.md)

# weber

A hackable CLI coding agent built with TypeScript, OpenAI SDK, and Ink. Works in your terminal, streams output, executes tools in your workspace, and supports tasks, skills, MCP integration, and multi-agent collaboration.

**Small enough to read end-to-end. Opinionated enough to be useful daily.**

---

## Quick Start

### Install

```bash
npm install -g @lwmxiaobei/weber
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

---

## MCP

Configure in `~/.weber/settings.json`:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "filesystem",
        "enabled": true,
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
      }
    ]
  }
}
```

MCP tools are exposed as normal function tools. Resources and prompts accessible via `list_mcp_resources`, `read_mcp_resource`, and `mcp_call`.

See [docs/mcp-overview.md](./docs/mcp-overview.md) for details.

---

## Team Mode

Persistent teammates with names, roles, and inboxes.

```
.team/
  config.json
  inbox/
    lead.jsonl
    <teammate>.jsonl
```

Tools: `teammate_spawn`, `teammate_list`, `teammate_shutdown`, `message_send`, `lead_inbox`

Use `task` for one-shot isolated sub-agents. Use teammates for ongoing coordination.

---

## Architecture

```
src/
  index.tsx       # CLI UI, input loop, command dispatch
  agent.ts        # core agent loop, tool execution
  tools.ts        # tool schemas and handlers
  config.ts       # settings loading, provider resolution
  prompt.ts       # system prompt construction
  compact.ts      # context compaction
  task-manager.ts # persistent task storage
  message-bus.ts  # inbox-based messaging
  teammate-manager.ts # teammate lifecycle
  mcp/            # MCP runtime, manager, client
  skills/         # skill parsing and rendering
test/             # node:test test suite
docs/             # design notes
skills/           # example local skills
```

---

## Development

```bash
npm install
npm run dev      # run in development
npm run build    # build to dist/
npm start        # run compiled
npm test         # run tests
```

---

## License

See [LICENSE](./LICENSE)
