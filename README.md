# 🪽 Castiel AI

**Castiel AI** is a self-contained multi-agent AI command center built from [`msitarzewski/agency-agents`](https://github.com/msitarzewski/agency-agents), indexing **all 283 specialized AI agents** across **18 divisions** with an **in-built Neural-NEXUS AI coordinator** (zero external API keys required).

## What's Inside
- **In-Built Neural-NEXUS Coordinator (`backend/castiel_engine.py`)**: Hybrid TF-IDF + 128-dim Latent Semantic Analysis (LSA) router, domain ontology expansion, automatic mode selection (`NEXUS-Micro`, `NEXUS-Sprint`, `NEXUS-Full`, `1-on-1`), phase allocation, tailored specialist synthesis, NEXUS handoff packets, and Reality Checker QA gate verification.
- **283-Agent Catalog (`backend/catalog.py` & `data/catalog.json`)**: Full parsed knowledge for every specialist across Academic, Design, Engineering, Finance, Game Development, GIS, Healthcare, Marketing, Paid Media, Product, Project Management, Research, Sales, Security, Spatial Computing, Specialized, Support, and Testing.
- **4 NEXUS Scenario Runbooks**: `startup-mvp`, `enterprise-feature`, `marketing-campaign`, and `incident-response`.
- **17-Tool Export Engine**: Export any specialist or custom squad to Claude Code (`.md`), Cursor (`.mdc`), Codex (`.toml`), Gemini CLI (`.md`), Windsurf (`.windsurfrules`), or Aider (`CONVENTIONS.md`).
- **Optional External LLM Layer**: Works 100% natively out of the box, with optional Ollama / OpenAI / Anthropic / Gemini / OpenRouter enhancement in Engine Settings.

## Running Locally
```bash
./start.sh
```
Serves both the React UI and Python `aiohttp` API on port `3000`.

## Deploying on Vercel
The repository is configured for Vercel via `vercel.json`:
- **Frontend (`frontend/`)**: Vite + React + Tailwind CSS built to `frontend/dist` (`cd frontend && npm install --include=dev` and `cd frontend && npm run build`).
- **Serverless API (`api/`)**: Node.js serverless endpoints (`/api/health`, `/api/catalog`, `/api/agents/[slug]`, `/api/route`, `/api/chat`, `/api/export`, `/api/sessions`) with `data/catalog.json` bundled via `functions.includeFiles`.
