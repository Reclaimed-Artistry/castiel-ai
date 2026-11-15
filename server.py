import json
import os
import pathlib
import sqlite3
import time
import uuid
from aiohttp import web

from catalog import load_catalog
from castiel_engine import CastielSemanticEngine, render_agent_export

BASE_DIR = pathlib.Path("/home/user/castiel-ai")
DB_PATH = BASE_DIR / "data" / "castiel.db"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"


def init_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            mode TEXT NOT NULL,
            agent_slug TEXT,
            runbook_slug TEXT,
            squad_json TEXT,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            orchestration_json TEXT,
            created_at REAL NOT NULL,
            FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    return conn


def compact_agent(a: dict) -> dict:
    return {
        "slug": a["slug"],
        "name": a["name"],
        "division": a["division"],
        "divisionLabel": a["divisionLabel"],
        "divisionColor": a["divisionColor"],
        "divisionIcon": a["divisionIcon"],
        "subdivision": a["subdivision"],
        "description": a["description"],
        "emoji": a["emoji"],
        "vibe": a["vibe"],
        "color": a["color"],
        "keywords": a["keywords"],
        "wordCount": a["wordCount"],
        "missionPreview": a["missionBullets"][:3],
        "ruleCount": len(a["ruleBullets"]),
        "capabilityCount": len(a["capabilityBullets"]),
    }


def create_app() -> web.Application:
    catalog = load_catalog()
    engine = CastielSemanticEngine(catalog)
    db = init_db()

    app = web.Application()
    app["catalog"] = catalog
    app["engine"] = engine
    app["db"] = db

    async def health(request: web.Request) -> web.Response:
        return web.json_response({
            "status": "ok",
            "name": "Castiel AI",
            "engine": "castiel-inbuilt-v1",
            "totalAgents": catalog["totalAgents"],
            "totalDivisions": catalog["totalDivisions"],
            "runbooks": len(catalog["runbooks"]),
        })

    async def get_catalog(request: web.Request) -> web.Response:
        return web.json_response({
            "name": "Castiel AI",
            "sourceRepo": catalog["sourceRepo"],
            "totalAgents": catalog["totalAgents"],
            "totalDivisions": catalog["totalDivisions"],
            "divisions": catalog["divisions"],
            "runbooks": [
                {
                    "slug": r["slug"],
                    "title": r["title"],
                    "mode": r["mode"],
                    "duration": r["duration"],
                    "summary": r["summary"],
                    "roster": r["roster"],
                }
                for r in catalog["runbooks"]
            ],
            "playbooks": [
                {"slug": p["slug"], "title": p["title"]}
                for p in catalog["playbooks"]
            ],
            "tools": [
                {
                    "kebab": k,
                    "label": v["label"],
                    "short": v["short"],
                    "accent": v["accent"],
                    "format": v["format"],
                    "installKind": v["installKind"],
                }
                for k, v in catalog["tools"].items()
            ],
            "agents": [compact_agent(a) for a in catalog["agents"]],
        })

    async def get_agent(request: web.Request) -> web.Response:
        slug = request.match_info["slug"]
        agent = engine.agent_by_slug.get(slug)
        if not agent:
            return web.json_response({"error": "Agent not found"}, status=404)
        return web.json_response(agent)

    async def route_query(request: web.Request) -> web.Response:
        body = await request.json()
        query = (body.get("query") or "").strip()
        division = body.get("division") or None
        top_k = min(int(body.get("topK") or 12), 40)
        if not query:
            return web.json_response({"results": [], "plan": None})
        ranked = engine.rank_agents(query, top_k=top_k, division_filter=division)
        plan = engine.plan_orchestration(query)
        return web.json_response({"results": ranked, "plan": plan})

    async def list_sessions(request: web.Request) -> web.Response:
        rows = db.execute(
            "SELECT id, title, mode, agent_slug, runbook_slug, squad_json, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT 40"
        ).fetchall()
        items = []
        for r in rows:
            items.append({
                "id": r["id"],
                "title": r["title"],
                "mode": r["mode"],
                "agentSlug": r["agent_slug"],
                "runbookSlug": r["runbook_slug"],
                "squad": json.loads(r["squad_json"] or "[]"),
                "createdAt": r["created_at"],
                "updatedAt": r["updated_at"],
            })
        return web.json_response({"sessions": items})

    async def get_session(request: web.Request) -> web.Response:
        sid = request.match_info["id"]
        srow = db.execute("SELECT * FROM sessions WHERE id = ?", (sid,)).fetchone()
        if not srow:
            return web.json_response({"error": "Session not found"}, status=404)
        mrows = db.execute(
            "SELECT id, role, content, orchestration_json, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
            (sid,),
        ).fetchall()
        messages = []
        for m in mrows:
            messages.append({
                "id": m["id"],
                "role": m["role"],
                "content": m["content"],
                "orchestration": json.loads(m["orchestration_json"]) if m["orchestration_json"] else None,
                "createdAt": m["created_at"],
            })
        return web.json_response({
            "session": {
                "id": srow["id"],
                "title": srow["title"],
                "mode": srow["mode"],
                "agentSlug": srow["agent_slug"],
                "runbookSlug": srow["runbook_slug"],
                "squad": json.loads(srow["squad_json"] or "[]"),
                "createdAt": srow["created_at"],
                "updatedAt": srow["updated_at"],
            },
            "messages": messages,
        })

    async def delete_session(request: web.Request) -> web.Response:
        sid = request.match_info["id"]
        db.execute("DELETE FROM messages WHERE session_id = ?", (sid,))
        db.execute("DELETE FROM sessions WHERE id = ?", (sid,))
        db.commit()
        return web.json_response({"deleted": True})

    async def chat(request: web.Request) -> web.Response:
        body = await request.json()
        prompt = (body.get("prompt") or "").strip()
        if not prompt:
            return web.json_response({"error": "Prompt is required"}, status=400)

        session_id = body.get("sessionId") or str(uuid.uuid4())
        mode = body.get("mode") or "auto"
        agent_slug = body.get("agentSlug") or None
        squad_slugs = body.get("squadSlugs") or None
        runbook_slug = body.get("runbookSlug") or None
        llm_config = body.get("llmConfig") or None

        # Fetch prior messages for context
        prior = db.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 12",
            (session_id,),
        ).fetchall()
        history = [{"role": r["role"], "content": r["content"]} for r in prior]

        if llm_config and llm_config.get("enabled"):
            result = engine.execute_external_llm(
                prompt=prompt,
                llm_config=llm_config,
                mode=mode,
                agent_slug=agent_slug,
                squad_slugs=squad_slugs,
                runbook_slug=runbook_slug,
                history=history,
            )
        else:
            result = engine.execute_inbuilt(
                prompt=prompt,
                mode=mode,
                agent_slug=agent_slug,
                squad_slugs=squad_slugs,
                runbook_slug=runbook_slug,
                history=history,
            )

        now = time.time()
        existing = db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
        squad_meta = [s["slug"] for s in result["squad"]]
        if not existing:
            title = prompt[:64] + ("..." if len(prompt) > 64 else "")
            db.execute(
                "INSERT INTO sessions (id, title, mode, agent_slug, runbook_slug, squad_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (session_id, title, mode, agent_slug, runbook_slug, json.dumps(squad_meta), now, now),
            )
        else:
            db.execute(
                "UPDATE sessions SET updated_at = ?, squad_json = ? WHERE id = ?",
                (now, json.dumps(squad_meta), session_id),
            )

        user_msg_id = str(uuid.uuid4())
        ai_msg_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO messages (id, session_id, role, content, orchestration_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_msg_id, session_id, "user", prompt, None, now),
        )
        db.execute(
            "INSERT INTO messages (id, session_id, role, content, orchestration_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (ai_msg_id, session_id, "assistant", result["synthesisMarkdown"], json.dumps(result), now + 0.001),
        )
        db.commit()

        return web.json_response({
            "sessionId": session_id,
            "messageId": ai_msg_id,
            "result": result,
        })

    async def export_agents(request: web.Request) -> web.Response:
        body = await request.json()
        slugs = body.get("slugs") or []
        tool_format = body.get("format") or "claude-code"
        files = []
        for s in slugs:
            agent = engine.agent_by_slug.get(s)
            if agent:
                files.append(render_agent_export(agent, tool_format))
        return web.json_response({"format": tool_format, "files": files})

    app.router.add_get("/api/health", health)
    app.router.add_get("/api/catalog", get_catalog)
    app.router.add_get("/api/agents/{slug}", get_agent)
    app.router.add_post("/api/route", route_query)
    app.router.add_get("/api/sessions", list_sessions)
    app.router.add_get("/api/sessions/{id}", get_session)
    app.router.add_delete("/api/sessions/{id}", delete_session)
    app.router.add_post("/api/chat", chat)
    app.router.add_post("/api/export", export_agents)

    # Serve built frontend static assets if available
    if FRONTEND_DIST.exists():
        assets_dir = FRONTEND_DIST / "assets"
        if assets_dir.exists():
            app.router.add_static("/assets", str(assets_dir))

        async def spa_index(request: web.Request) -> web.Response:
            return web.FileResponse(FRONTEND_DIST / "index.html")

        app.router.add_get("/", spa_index)
        app.router.add_get("/{tail:.*}", spa_index)

    return app


if __name__ == "__main__":
    port = int(os.environ.get("CASTIEL_PORT", "8000"))
    web.run_app(create_app(), host="0.0.0.0", port=port)
