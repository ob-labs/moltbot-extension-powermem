# Moltbot Memory (PowerMem) Plugin

This plugin lets [Moltbot](https://github.com/moltbot/moltbot) use long-term memory via the [PowerMem](https://github.com/oceanbase/powermem) HTTP API: intelligent extraction, Ebbinghaus forgetting curve, multi-agent isolation. **No Python inside Moltbot**—only a separately running PowerMem server is required.

Follow the steps in order: install and start PowerMem, then install the plugin, configure Moltbot, and verify.

---

## Prerequisites

- **Moltbot** installed (CLI + gateway working)
- **PowerMem server**: install and run it separately (choose one of the two methods below)
- For PowerMem’s “intelligent extraction”: configure LLM + Embedding API keys in PowerMem’s `.env` (e.g. Qwen / OpenAI)

---

## Step 1: Install and start PowerMem

Choose **Option A (pip)** or **Option B (Docker)**.

### Option A: Install with pip (run server locally)

Best if you already have Python 3.10+.

**1. Install PowerMem**

```bash
pip install powermem
```

**2. Prepare config**

In **any directory** where you want to keep config (e.g. `~/powermem`):

```bash
mkdir -p ~/powermem && cd ~/powermem
# If you cloned PowerMem: cp /path/to/powermem/.env.example .env
# Otherwise use the minimal .env below.
```

If you did not clone the PowerMem repo, create a `.env` with at least: database + LLM + Embedding. Here is a **minimal working example** (SQLite + Qwen; replace with your API key):

```bash
# Create .env in ~/powermem (replace your_api_key_here)
cat > .env << 'EOF'
TIMEZONE=Asia/Shanghai
DATABASE_PROVIDER=sqlite
SQLITE_PATH=./data/powermem_dev.db
SQLITE_COLLECTION=memories

LLM_PROVIDER=qwen
LLM_API_KEY=your_api_key_here
LLM_MODEL=qwen-plus

EMBEDDING_PROVIDER=qwen
EMBEDDING_API_KEY=your_api_key_here
EMBEDDING_MODEL=text-embedding-v4
EMBEDDING_DIMS=1536
EOF
```

Replace `your_api_key_here` with your Qwen API key. For OpenAI or others, see PowerMem’s [.env.example](https://github.com/oceanbase/powermem/blob/master/.env.example) for `LLM_*` and `EMBEDDING_*`.

**3. Start the HTTP server**

Run this **in the same directory as `.env`**:

```bash
cd ~/powermem   # or wherever .env lives
powermem-server --host 0.0.0.0 --port 8000
```

You should see something like `Uvicorn running on http://0.0.0.0:8000`. Leave this terminal open.

**4. Verify PowerMem**

In a new terminal:

```bash
curl -s http://localhost:8000/api/v1/system/health
```

If you get JSON (e.g. with `"status":"healthy"`), PowerMem is ready.

---

### Option B: Run with Docker (no Python needed)

Best if you have Docker and prefer not to install Python.

**1. Clone PowerMem and prepare .env**

```bash
git clone https://github.com/oceanbase/powermem.git
cd powermem
cp .env.example .env
```

Edit `.env` and set at least:

- `LLM_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`
- `EMBEDDING_API_KEY`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`

Database can stay default (SQLite).

**2. Start the container**

From the **powermem project root** (same level as `.env`):

```bash
docker-compose -f docker/docker-compose.yml up -d
```

**3. Verify**

```bash
curl -s http://localhost:8000/api/v1/system/health
```

JSON response means the server is up. API docs: `http://localhost:8000/docs`.

---

## Step 2: Install the plugin into Moltbot

On your machine (use your actual plugin path):

```bash
# Install from a local directory (e.g. cloned repo)
moltbot plugins install /path/to/moltbot-extension-powermem

# For development (symlink, no copy)
moltbot plugins install -l /path/to/moltbot-extension-powermem
```

After install, run `moltbot plugins list` and confirm `memory-powermem` is listed.

---

## Step 3: Configure Moltbot to use the plugin

Edit Moltbot’s config (e.g. `~/.clawdbot/config.json` or project `moltbot.json`). Add or merge a top-level `plugins` section, set the memory slot to this plugin, and set the PowerMem URL.

**Example (JSON):**

```json
{
  "plugins": {
    "slots": { "memory": "memory-powermem" },
    "entries": {
      "memory-powermem": {
        "enabled": true,
        "config": {
          "baseUrl": "http://localhost:8000",
          "autoCapture": true,
          "autoRecall": true,
          "inferOnAdd": true
        }
      }
    }
  }
}
```

Notes:

- `baseUrl`: PowerMem HTTP base URL **without** `/api/v1`, e.g. `http://localhost:8000` or your host/port.
- If PowerMem has API key auth, add `"apiKey": "your-key"` under `config`.
- **Restart the Moltbot gateway** (or Mac menubar app) after changing config.

---

## Step 4: Verify plugin and PowerMem connection

In a terminal:

```bash
# Check PowerMem reachability
moltbot ltm health
```

If there are no errors and you see a healthy status, the plugin is talking to PowerMem.

Then try a manual add and search:

```bash
# Add a memory
moltbot ltm add "I prefer a cup of Americano every morning"

# Search by content
moltbot ltm search "coffee"
```

If search returns the line you added (or similar), the full flow (PowerMem → plugin → Moltbot) is working.

---

## Config options (optional)

| Option        | Required | Description |
|---------------|----------|-------------|
| `baseUrl`     | Yes      | PowerMem API base URL, e.g. `http://localhost:8000`, no `/api/v1` suffix. |
| `apiKey`      | No       | Set when PowerMem server has API key authentication enabled. |
| `userId`      | No       | PowerMem `user_id` for isolation; default `moltbot-user`. |
| `agentId`     | No       | PowerMem `agent_id` for isolation; default `moltbot-agent`. |
| `autoCapture` | No       | Auto-store from conversations after agent ends; default `true`. |
| `autoRecall`  | No       | Auto-inject relevant memories before agent starts; default `true`. |
| `inferOnAdd`  | No       | Use PowerMem intelligent extraction when adding; default `true`. |

**Auto-capture:** When a conversation ends, user/assistant text is sent to PowerMem with `infer: true`. PowerMem extracts and stores memories. At most 3 chunks per session (each up to 6000 chars).

---

## Agent tools

Exposed to Moltbot agents:

- **memory_recall** — Search long-term memories by query.
- **memory_store** — Save information (with optional infer).
- **memory_forget** — Delete by memory ID or by search query.

---

## Moltbot CLI (when plugin enabled)

- `moltbot ltm search <query> [--limit n]` — Search memories.
- `moltbot ltm health` — Check PowerMem server health.
- `moltbot ltm add "<text>"` — Manually store one memory.

---

## Troubleshooting

**1. `moltbot ltm health` fails or cannot connect**

- Ensure PowerMem is running (Option A terminal still open, or Docker container up).
- Ensure `baseUrl` matches the real address (use `http://localhost:8000` for local).
- If Moltbot and PowerMem are on different machines, use PowerMem’s host IP or hostname instead of `localhost`.

**2. Add/search returns nothing or 500**

- Check PowerMem terminal or Docker logs; often LLM/Embedding not configured or wrong API key.
- Ensure `LLM_API_KEY` and `EMBEDDING_API_KEY` in `.env` are set and valid.

**3. Plugin installed but Moltbot not using memory**

- Confirm `plugins.slots.memory` is `memory-powermem` and `plugins.entries["memory-powermem"].enabled` is `true`.
- Restart the gateway (or Moltbot app) after config changes.

---

## Repository development

```bash
cd /path/to/moltbot-extension-powermem
pnpm install
pnpm lint   # type-check
pnpm test   # run tests (if any)
```

---

## License

Apache License 2.0. See [LICENSE](LICENSE).
