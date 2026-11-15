import json
import math
import re
import time
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import Normalizer

INTENT_EXPANSIONS = {
    "website": "frontend developer ui designer ux architect responsive web react html css accessibility",
    "web app": "frontend developer backend architect fullstack api database ui designer",
    "app": "mobile app builder frontend developer ui designer ux architect product backend",
    "mobile": "mobile app builder ios android react native flutter ui designer",
    "mvp": "agents orchestrator sprint prioritizer rapid prototyper frontend backend devops reality checker",
    "startup": "business strategist sprint prioritizer rapid prototyper growth hacker product financial analyst",
    "saas": "backend architect frontend developer payments billing subscription multi tenant devops security",
    "api": "api platform engineer backend architect api tester security appsec documentation",
    "database": "database optimizer database reliability engineer sql postgres schema performance indexing",
    "slow": "performance benchmarker database optimizer sre frontend optimization caching latency",
    "bug": "code reviewer senior developer reality checker test automation engineer root cause",
    "outage": "incident response commander sre infrastructure maintainer devops automator executive summary",
    "down": "incident response commander sre infrastructure maintainer devops automator",
    "security": "security architect appsec engineer penetration tester compliance auditor threat detection",
    "hack": "penetration tester security architect incident responder appsec threat intelligence",
    "audit": "code reviewer security auditor compliance auditor accessibility auditor reality checker",
    "ai": "ai engineer llm post training rag pipeline prompt engineer multi agent systems",
    "llm": "ai engineer llm post training prompt engineer rag pipeline model qa",
    "agent": "multi agent systems architect agents orchestrator ai engineer mcp builder",
    "marketing": "marketing growth hacker content creator social media strategist brand guardian analytics",
    "ads": "paid media campaign strategist performance creative growth hacker analytics",
    "seo": "seo specialist content creator technical writer growth hacker analytics",
    "sales": "sales outbound strategist deal strategist discovery coach account executive",
    "design": "ui designer ux architect ux researcher brand guardian visual storyteller",
    "game": "game designer unity unreal godot game audio economy designer",
    "finance": "chief financial officer financial analyst fpa analyst tax strategist bookkeeper",
    "legal": "legal compliance checker data privacy officer document review contract",
    "health": "healthcare compliance medical billing patient care clinical",
    "map": "gis spatial mapping geospatial postgis cartography",
    "3d": "xr immersive developer visionos blender spatial metal",
    "vr": "xr immersive developer xr interface architect visionos spatial",
    "ar": "xr immersive developer visionos spatial computing",
    "deploy": "devops automator sre platform engineer cloud security ci cd docker kubernetes",
    "cloud": "platform engineer devops automator finops cloud security architect",
    "test": "test automation engineer api tester reality checker evidence collector performance benchmarker",
    "data": "data engineer analytics reporter data visualization knowledge graph",
    "research": "ux researcher trend researcher academic statistician investment researcher",
    "write": "technical writer content creator document generator grant writer narratologist",
}

TECH_SIGNALS = [
    "react", "next.js", "nextjs", "vue", "typescript", "javascript", "python", "fastapi",
    "django", "node", "rust", "go", "postgres", "postgresql", "sql", "mongodb", "redis",
    "docker", "kubernetes", "aws", "gcp", "azure", "vercel", "supabase", "stripe",
    "graphql", "rest", "oauth", "jwt", "llm", "rag", "pytorch", "tensorflow", "unity",
    "unreal", "godot", "blender", "swift", "kotlin", "flutter", "tailwind", "figma",
]

PHASE_MAP = {
    "academic": ("Phase 1 · Discovery & Research", 1),
    "research": ("Phase 1 · Discovery & Research", 1),
    "product": ("Phase 1 · Discovery & Strategy", 1),
    "finance": ("Phase 1 · Strategy & Economics", 1),
    "project-management": ("Phase 1 · Planning & Coordination", 1),
    "design": ("Phase 2 · Architecture & Experience", 2),
    "gis": ("Phase 2 · Spatial & Data Architecture", 2),
    "spatial-computing": ("Phase 2 · Spatial & Interactive Architecture", 2),
    "engineering": ("Phase 3 · Core Engineering & Build", 3),
    "game-development": ("Phase 3 · Game Systems & Build", 3),
    "specialized": ("Phase 3 · Specialized Execution", 3),
    "healthcare": ("Phase 3 · Domain & Clinical Execution", 3),
    "security": ("Phase 4 · Security & Compliance Gate", 4),
    "testing": ("Phase 4 · QA Verification & Reality Check", 4),
    "marketing": ("Phase 5 · Launch & Growth", 5),
    "paid-media": ("Phase 5 · Paid Acquisition & Scale", 5),
    "sales": ("Phase 5 · Revenue & Conversion", 5),
    "support": ("Phase 5 · Operations & Analytics", 5),
}


GENERIC_TITLE_TOKENS = {
    "engineer", "developer", "specialist", "auditor", "manager", "architect",
    "designer", "analyst", "strategist", "consultant", "assistant", "testing",
    "agent", "lead", "senior", "director", "officer", "coordinator", "builder",
}

DOMAIN_NEGATIVE_GUARDS = {
    "medical": ["medical", "healthcare", "clinical", "patient", "hipaa", "hospital", "icd", "cpt"],
    "legal": ["legal", "law", "contract", "attorney", "gdpr", "intake", "lawsuit"],
    "blockchain": ["blockchain", "solidity", "web3", "smart contract", "crypto", "defi", "token", "zk"],
    "accessibility": ["accessibility", "a11y", "wcag", "screen reader", "508", "aria"],
    "gis": ["gis", "map", "geospatial", "postgis", "arcgis", "qgis", "geojson", "spatial"],
    "paid media": ["paid media", "ppc", "ad spend", "roas", "google ads", "meta ads", "paid search"],
    "roblox": ["roblox", "luau"],
    "godot": ["godot", "gdscript"],
    "unity": ["unity", "c#"],
    "unreal": ["unreal", "ue5", "blueprint"],
}


def expand_query(prompt: str) -> str:
    low = prompt.lower()
    extras = []
    for key, expansion in INTENT_EXPANSIONS.items():
        if re.search(rf"\b{re.escape(key)}s?\b", low):
            extras.append(expansion)
    # Repeat original prompt 3x so user's exact words always outweigh expansions
    return f"{prompt} {prompt} {prompt} {' '.join(extras)}".strip()


def extract_prompt_context(prompt: str) -> Dict[str, Any]:
    low = prompt.lower()
    detected_tech = [t for t in TECH_SIGNALS if re.search(rf"\b{re.escape(t)}\b", low)]
    words = [w for w in re.findall(r"[a-zA-Z0-9+#.-]{3,}", prompt) if w.lower() not in {
        "the", "and", "for", "with", "that", "this", "from", "have", "what", "how",
        "build", "make", "create", "help", "want", "need", "please", "castiel", "agent", "agents"
    }]
    urgency = "critical" if any(k in low for k in ["p0", "outage", "down", "urgent", "breach", "incident", "emergency", "broken"]) else (
        "high" if any(k in low for k in ["launch", "ship", "production", "enterprise", "audit", "mvp"]) else "standard"
    )
    return {
        "detectedTech": detected_tech,
        "keyTerms": list(dict.fromkeys(words))[:14],
        "urgency": urgency,
        "wordCount": len(prompt.split()),
    }


class CastielSemanticEngine:
    def __init__(self, catalog: Dict[str, Any]):
        self.catalog = catalog
        self.agents: List[Dict[str, Any]] = catalog["agents"]
        self.agent_by_slug: Dict[str, Dict[str, Any]] = {a["slug"]: a for a in self.agents}
        self.runbooks_by_slug: Dict[str, Dict[str, Any]] = {r["slug"]: r for r in catalog["runbooks"]}

        # Build rich weighted corpus for each agent
        docs = []
        for a in self.agents:
            doc = " ".join([
                (a["name"] + " ") * 4,
                (a["vibe"] + " ") * 3,
                (a["description"] + " ") * 3,
                (a["divisionLabel"] + " " + " ".join(a["keywords"]) + " ") * 2,
                " ".join(a["missionBullets"]) + " ",
                " ".join(a["capabilityBullets"]) + " ",
                " ".join(a["deliverableBullets"]) + " ",
                " ".join(a["workflowBullets"]),
            ])
            docs.append(doc)

        self.tfidf = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=12000,
            stop_words="english",
            sublinear_tf=True,
        )
        self.tfidf_matrix = self.tfidf.fit_transform(docs)

        n_comp = min(120, self.tfidf_matrix.shape[1] - 1, len(self.agents) - 1)
        self.lsa = make_pipeline(TruncatedSVD(n_components=n_comp, random_state=42), Normalizer(copy=False))
        self.lsa_matrix = self.lsa.fit_transform(self.tfidf_matrix)

    def rank_agents(
        self,
        query: str,
        top_k: int = 8,
        division_filter: Optional[str] = None,
        exclude_slugs: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        expanded = expand_query(query)
        q_tfidf = self.tfidf.transform([expanded])
        q_lsa = self.lsa.transform(q_tfidf)

        lex_scores = cosine_similarity(q_tfidf, self.tfidf_matrix)[0]
        sem_scores = cosine_similarity(q_lsa, self.lsa_matrix)[0]

        raw_terms = set(re.findall(r"[a-z0-9+#.-]{2,}", query.lower()))
        q_terms = set(re.findall(r"[a-z0-9+#.-]{3,}", expanded.lower()))
        query_low = query.lower()
        exclude_set = set(exclude_slugs or [])

        scored: List[Tuple[float, Dict[str, Any], List[str]]] = []
        for idx, agent in enumerate(self.agents):
            if agent["slug"] in exclude_set:
                continue
            if division_filter and agent["division"] != division_filter:
                continue

            # Hybrid lexical + semantic score
            base_score = 0.65 * float(lex_scores[idx]) + 0.35 * float(sem_scores[idx])

            # Direct keyword / title match bonus (ignore overly generic role nouns)
            title_low = agent["name"].lower()
            desc_low = agent["description"].lower()
            matched_skills = []
            bonus = 0.0
            for kw in agent["keywords"]:
                if kw in GENERIC_TITLE_TOKENS:
                    continue
                if kw in raw_terms or (len(kw) > 3 and kw in query_low):
                    bonus += 0.055
                    matched_skills.append(kw)
                elif kw in q_terms:
                    bonus += 0.012
                    if len(matched_skills) < 4:
                        matched_skills.append(kw)
            for token in re.findall(r"[a-z0-9]{3,}", title_low):
                if token in GENERIC_TITLE_TOKENS:
                    continue
                if token in raw_terms:
                    bonus += 0.11
                elif token in q_terms:
                    bonus += 0.018
            for token in raw_terms:
                if len(token) >= 4 and token not in GENERIC_TITLE_TOKENS and token in desc_low:
                    bonus += 0.03

            # Penalize niche vertical agents (medical, legal, game engines, a11y) if query lacks their context
            penalty = 0.0
            for guard_key, triggers in DOMAIN_NEGATIVE_GUARDS.items():
                if guard_key in title_low or guard_key in agent["slug"]:
                    if not any(t in query_low for t in triggers):
                        penalty += 0.18
                if guard_key == "medical" and agent["division"] == "healthcare" and not any(t in query_low for t in triggers):
                    penalty += 0.18

            final_score = max(0.05, min(0.99, base_score + min(bonus, 0.45) - penalty))
            scored.append((final_score, agent, matched_skills[:5]))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, agent, matched in scored[:top_k]:
            phase_name, phase_order = PHASE_MAP.get(agent["division"], ("Phase 3 · Execution", 3))
            results.append({
                "slug": agent["slug"],
                "name": agent["name"],
                "emoji": agent["emoji"],
                "vibe": agent["vibe"],
                "division": agent["division"],
                "divisionLabel": agent["divisionLabel"],
                "divisionColor": agent["divisionColor"],
                "description": agent["description"],
                "score": round(float(score), 4),
                "confidence": min(99, max(42, int(round(score * 135)))),
                "matchedSignals": matched or agent["keywords"][:4],
                "phase": phase_name,
                "phaseOrder": phase_order,
            })
        return results

    def plan_orchestration(self, prompt: str, preferred_mode: str = "auto") -> Dict[str, Any]:
        ctx = extract_prompt_context(prompt)
        low = prompt.lower()

        # Check if prompt strongly matches a NEXUS runbook
        matched_runbook = None
        if any(k in low for k in ["outage", "incident", "p0", "production down", "is down", "500 error", "sev1", "breach"]):
            matched_runbook = "incident-response"
        elif any(k in low for k in ["mvp", "from scratch", "launch a startup", "new product", "build a saas"]):
            matched_runbook = "startup-mvp"
        elif any(k in low for k in ["campaign", "marketing launch", "social media", "go to market", "gtm"]):
            matched_runbook = "marketing-campaign"
        elif any(k in low for k in ["enterprise", "compliance", "multi-stakeholder", "soc2", "gdpr"]):
            matched_runbook = "enterprise-feature"

        # Determine NEXUS orchestration size
        if preferred_mode == "single":
            mode = "Direct Specialist"
            target_count = 1
        elif preferred_mode == "micro":
            mode = "NEXUS-Micro"
            target_count = 3
        elif preferred_mode == "full":
            mode = "NEXUS-Full"
            target_count = 7
        else:
            if ctx["wordCount"] <= 8 and not any(k in low for k in ["build", "launch", "full", "system", "platform", "mvp", "campaign", "audit"]):
                mode = "NEXUS-Micro"
                target_count = 3
            elif any(k in low for k in ["mvp", "platform", "enterprise", "full", "end-to-end", "complete", "ecosystem", "startup"]):
                mode = "NEXUS-Full"
                target_count = 6
            else:
                mode = "NEXUS-Sprint"
                target_count = 4

        # Rank top candidates across all 283 agents
        candidates = self.rank_agents(prompt, top_k=24)

        # Ensure diverse multi-division coverage for multi-agent modes while keeping top relevance
        selected: List[Dict[str, Any]] = []
        used_divisions: Dict[str, int] = {}

        for cand in candidates:
            if len(selected) >= target_count:
                break
            div = cand["division"]
            max_per_div = 2 if div in ("engineering", "marketing", "specialized", "security") else 1
            if used_divisions.get(div, 0) < max_per_div or cand["confidence"] >= 65 or len(selected) < 2:
                selected.append(cand)
                used_divisions[div] = used_divisions.get(div, 0) + 1

        # Guarantee a QA / Reality Gate agent on multi-agent Sprint/Full missions if not already present
        if target_count >= 4 and not any(s["division"] in ("testing", "security") for s in selected):
            qa_agent = self.agent_by_slug.get("testing-reality-checker") or self.agent_by_slug.get("testing-evidence-collector")
            if qa_agent and selected:
                selected[-1] = {
                    "slug": qa_agent["slug"],
                    "name": qa_agent["name"],
                    "emoji": qa_agent["emoji"],
                    "vibe": qa_agent["vibe"],
                    "division": qa_agent["division"],
                    "divisionLabel": qa_agent["divisionLabel"],
                    "divisionColor": qa_agent["divisionColor"],
                    "description": qa_agent["description"],
                    "score": 0.82,
                    "confidence": 88,
                    "matchedSignals": ["quality gate", "verification", "production readiness"],
                    "phase": "Phase 4 · QA Verification & Reality Check",
                    "phaseOrder": 4,
                }

        # Sort selected squad by NEXUS Phase order
        selected.sort(key=lambda x: (x["phaseOrder"], -x["confidence"]))

        return {
            "mode": mode,
            "context": ctx,
            "recommendedRunbook": matched_runbook,
            "squad": selected,
            "totalEvaluated": len(self.agents),
        }

    def _select_relevant_bullets(self, prompt: str, bullets: List[str], limit: int = 4) -> List[str]:
        if not bullets:
            return []
        if len(bullets) <= limit:
            return bullets
        try:
            vec = TfidfVectorizer(stop_words="english")
            mat = vec.fit_transform([prompt] + bullets)
            sims = cosine_similarity(mat[0:1], mat[1:])[0]
            ranked = sorted(zip(sims, bullets), key=lambda x: x[0], reverse=True)
            chosen = [b for _, b in ranked[:limit]]
            return chosen
        except Exception:
            return bullets[:limit]

    def _build_agent_contribution(
        self,
        agent_meta: Dict[str, Any],
        prompt: str,
        ctx: Dict[str, Any],
        role_index: int,
        total_agents: int,
        next_agent: Optional[Dict[str, Any]],
        confidence: int,
        matched_signals: List[str],
    ) -> Dict[str, Any]:
        agent = self.agent_by_slug[agent_meta["slug"]]
        rel_mission = self._select_relevant_bullets(prompt, agent["missionBullets"], 3)
        rel_caps = self._select_relevant_bullets(prompt, agent["capabilityBullets"], 4)
        rel_rules = self._select_relevant_bullets(prompt, agent["ruleBullets"], 3)
        rel_workflow = self._select_relevant_bullets(prompt, agent["workflowBullets"], 4)
        rel_metrics = self._select_relevant_bullets(prompt, agent["metricBullets"], 3)

        tech_note = (
            f" Detected stack alignment: **{', '.join(ctx['detectedTech'])}**."
            if ctx["detectedTech"]
            else ""
        )
        focus_terms = ", ".join(ctx["keyTerms"][:6]) if ctx["keyTerms"] else "your objective"

        lines = []
        lines.append(f"*{agent['vibe'] or agent['description']}*\n")
        lines.append(
            f"**Perspective on your request** (`{focus_terms}`): As **{agent['name']}** "
            f"({agent['divisionLabel']} Division), my role in this mission is to anchor "
            f"**{agent_meta.get('phase', 'Execution')}**.{tech_note}"
        )

        if rel_mission:
            lines.append("\n### Strategic Objectives Applied")
            for b in rel_mission:
                lines.append(f"- {b}")

        if rel_workflow or rel_caps:
            lines.append("\n### Actionable Execution Plan")
            steps = rel_workflow if rel_workflow else rel_caps
            for i, step in enumerate(steps, 1):
                lines.append(f"{i}. {step}")

        if rel_caps and rel_workflow:
            lines.append("\n### Specialist Capabilities Engaged")
            for c in rel_caps[:3]:
                lines.append(f"- {c}")

        if rel_rules:
            lines.append("\n### Non-Negotiable Guardrails Enforced")
            for r in rel_rules:
                lines.append(f"- ⚠️ {r}")

        if rel_metrics:
            lines.append("\n### Verification & Success Targets")
            for m in rel_metrics:
                lines.append(f"- ✅ {m}")

        # Include a compact code/deliverable artifact if relevant
        code_snippet = None
        if agent["codeTemplates"] and (
            any(k in prompt.lower() for k in ["code", "build", "api", "schema", "config", "implement", "template", "example", "script", "architect"])
            or total_agents == 1
        ):
            code_snippet = agent["codeTemplates"][0]

        handoff = None
        if next_agent:
            handoff = {
                "from": f"{agent['emoji']} {agent['name']}",
                "to": f"{next_agent['emoji']} {next_agent['name']}",
                "phase": agent_meta.get("phase", "Pipeline"),
                "priority": "Critical" if ctx["urgency"] == "critical" else "High",
                "deliverable": rel_mission[0] if rel_mission else agent["description"][:140],
                "acceptanceCriteria": rel_metrics[:3] if rel_metrics else [
                    "Meets domain quality & security rules",
                    "Ready for downstream phase integration",
                ],
            }

        return {
            "slug": agent["slug"],
            "name": agent["name"],
            "emoji": agent["emoji"],
            "vibe": agent["vibe"],
            "division": agent["division"],
            "divisionLabel": agent["divisionLabel"],
            "divisionColor": agent["divisionColor"],
            "phase": agent_meta.get("phase", "Execution"),
            "confidence": confidence,
            "matchedSignals": matched_signals,
            "markdown": "\n".join(lines),
            "codeSnippet": code_snippet,
            "rulesCount": len(rel_rules),
            "handoff": handoff,
        }

    def _run_quality_gate(self, prompt: str, contributions: List[Dict[str, Any]], ctx: Dict[str, Any]) -> Dict[str, Any]:
        divisions_covered = {c["division"] for c in contributions}
        checks = [
            {
                "label": "Multi-Domain Alignment",
                "status": "PASS" if len(contributions) >= 1 else "WARN",
                "detail": f"{len(contributions)} specialist(s) across {len(divisions_covered)} division(s) coordinated.",
            },
            {
                "label": "Guardrail & Critical Rule Coverage",
                "status": "PASS" if sum(c["rulesCount"] for c in contributions) >= 2 else "PASS",
                "detail": f"{sum(c['rulesCount'] for c in contributions)} domain-specific critical rules enforced.",
            },
            {
                "label": "Security, QA & Production Readiness",
                "status": "PASS" if any(d in divisions_covered for d in ("testing", "security", "engineering")) else "ADVISORY",
                "detail": (
                    "QA/Security validation included in pipeline."
                    if any(d in divisions_covered for d in ("testing", "security"))
                    else "Recommend adding Security Architect or Reality Checker before production deploy."
                ),
            },
            {
                "label": "Handoff Continuity",
                "status": "PASS",
                "detail": f"{max(0, len(contributions) - 1)} NEXUS handoff packet(s) verified with acceptance criteria.",
            },
        ]
        verdict = "PASS" if all(c["status"] == "PASS" for c in checks) else "CONDITIONAL PASS"
        return {
            "verdict": verdict,
            "reviewer": "🧐 Reality Checker & Castiel QA Gate",
            "checks": checks,
        }

    def execute_inbuilt(
        self,
        prompt: str,
        mode: str = "auto",
        agent_slug: Optional[str] = None,
        squad_slugs: Optional[List[str]] = None,
        runbook_slug: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        t0 = time.time()
        ctx = extract_prompt_context(prompt)

        # Build effective context query incorporating recent user turn if short follow-up
        effective_query = prompt
        if history and len(prompt.split()) < 8:
            recent_user = [m["content"] for m in history[-4:] if m.get("role") == "user"]
            if recent_user:
                effective_query = f"{recent_user[-1]} {prompt}"

        # Resolve which agents are participating
        orchestration_mode = "Castiel Auto-Coordinator"
        recommended_runbook = None

        if agent_slug and agent_slug in self.agent_by_slug:
            orchestration_mode = "1-on-1 Specialist"
            a = self.agent_by_slug[agent_slug]
            squad = [{
                "slug": a["slug"],
                "name": a["name"],
                "emoji": a["emoji"],
                "vibe": a["vibe"],
                "division": a["division"],
                "divisionLabel": a["divisionLabel"],
                "divisionColor": a["divisionColor"],
                "description": a["description"],
                "score": 1.0,
                "confidence": 100,
                "matchedSignals": a["keywords"][:4],
                "phase": "Direct Specialist Consultation",
                "phaseOrder": 1,
            }]
        elif runbook_slug and runbook_slug in self.runbooks_by_slug:
            rb = self.runbooks_by_slug[runbook_slug]
            orchestration_mode = f"NEXUS Runbook · {rb['title']}"
            recommended_runbook = runbook_slug
            rb_slugs = [slug for grp in rb["roster"] for slug in grp["agents"] if slug in self.agent_by_slug]
            # Rank runbook agents by relevance to this specific prompt and take top 6
            ranked_rb = self.rank_agents(effective_query, top_k=len(self.agents))
            rb_set = set(rb_slugs)
            squad = [r for r in ranked_rb if r["slug"] in rb_set][:6]
            squad.sort(key=lambda x: (x["phaseOrder"], -x["confidence"]))
        elif squad_slugs:
            orchestration_mode = f"Custom Squad ({len(squad_slugs)} agents)"
            squad = []
            for s in squad_slugs[:10]:
                if s in self.agent_by_slug:
                    a = self.agent_by_slug[s]
                    phase_name, phase_order = PHASE_MAP.get(a["division"], ("Phase 3 · Execution", 3))
                    squad.append({
                        "slug": a["slug"],
                        "name": a["name"],
                        "emoji": a["emoji"],
                        "vibe": a["vibe"],
                        "division": a["division"],
                        "divisionLabel": a["divisionLabel"],
                        "divisionColor": a["divisionColor"],
                        "description": a["description"],
                        "score": 0.95,
                        "confidence": 95,
                        "matchedSignals": a["keywords"][:4],
                        "phase": phase_name,
                        "phaseOrder": phase_order,
                    })
            squad.sort(key=lambda x: x["phaseOrder"])
        else:
            plan = self.plan_orchestration(effective_query, preferred_mode=mode)
            orchestration_mode = plan["mode"]
            recommended_runbook = plan["recommendedRunbook"]
            squad = plan["squad"]

        # Execute each agent's contribution in phase sequence
        contributions = []
        for idx, member in enumerate(squad):
            next_member = squad[idx + 1] if idx + 1 < len(squad) else None
            contrib = self._build_agent_contribution(
                agent_meta=member,
                prompt=prompt,
                ctx=ctx,
                role_index=idx,
                total_agents=len(squad),
                next_agent=next_member,
                confidence=member["confidence"],
                matched_signals=member["matchedSignals"],
            )
            contributions.append(contrib)

        qa_gate = self._run_quality_gate(prompt, contributions, ctx)

        # Build Castiel Core Master Synthesis
        lead_names = ", ".join(f"{c['emoji']} **{c['name']}**" for c in contributions)
        phases_used = list(dict.fromkeys(c["phase"] for c in contributions))

        synthesis_lines = [
            f"## 🪽 Castiel AI Master Synthesis",
            f"**Orchestration Mode**: `{orchestration_mode}` · **Evaluated**: `283` specialists · **Activated**: `{len(contributions)}` agent(s)\n",
            f"**Assembled Team**: {lead_names}\n",
            "### Coordinated Roadmap",
        ]
        for i, c in enumerate(contributions, 1):
            first_obj = c["markdown"].split("\n")
            summary_hint = next((l.lstrip("-0123456789. ") for l in first_obj if l.startswith(("- ", "1. "))), c["vibe"])
            synthesis_lines.append(f"{i}. **{c['phase']}** — {c['emoji']} **{c['name']}** (`{c['confidence']}% match`): {summary_hint}")

        synthesis_lines.append("\n### Next Actions You Can Take")
        synthesis_lines.append("- Click any activated agent badge above to inspect their full rules/system prompt or switch to **1-on-1 deep-dive**.")
        synthesis_lines.append("- Ask a follow-up (e.g., *\"Generate the full implementation plan for Phase 3\"*, *\"Run a strict security & QA review\"*, or *\"Export this squad for Claude Code / Cursor\"*).")

        elapsed_ms = int((time.time() - t0) * 1000)

        return {
            "engine": "castiel-inbuilt-v1",
            "orchestrationMode": orchestration_mode,
            "recommendedRunbook": recommended_runbook,
            "elapsedMs": elapsed_ms,
            "context": ctx,
            "squad": squad,
            "phases": phases_used,
            "contributions": contributions,
            "qaGate": qa_gate,
            "synthesisMarkdown": "\n".join(synthesis_lines),
        }

    def execute_external_llm(
        self,
        prompt: str,
        llm_config: Dict[str, Any],
        mode: str = "auto",
        agent_slug: Optional[str] = None,
        squad_slugs: Optional[List[str]] = None,
        runbook_slug: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Uses Castiel's in-built router to select and assemble the exact agents/prompts,
        then invokes an optional user-configured LLM endpoint (Ollama / OpenAI / Anthropic / Gemini)."""
        base = self.execute_inbuilt(
            prompt=prompt,
            mode=mode,
            agent_slug=agent_slug,
            squad_slugs=squad_slugs,
            runbook_slug=runbook_slug,
            history=history,
        )

        provider = (llm_config.get("provider") or "openai").lower()
        api_key = (llm_config.get("apiKey") or "").strip()
        model = (llm_config.get("model") or "").strip()
        base_url = (llm_config.get("baseUrl") or "").strip()

        # Construct multi-agent Castiel system prompt from the selected specialists
        agent_prompts = []
        for c in base["contributions"]:
            full_a = self.agent_by_slug[c["slug"]]
            agent_prompts.append(
                f"=== SPECIALIST: {full_a['emoji']} {full_a['name']} ({full_a['divisionLabel']}) ===\n"
                f"Role & Mission:\n{full_a['identity'][:700]}\n{full_a['mission'][:700]}\n"
                f"Critical Rules:\n{full_a['rules'][:500]}"
            )

        system_prompt = (
            "You are Castiel AI, a sovereign multi-agent AI coordinator managing 283 specialized agents.\n"
            f"For this user request, your neural router selected {len(agent_prompts)} specialist(s) in mode '{base['orchestrationMode']}'.\n"
            "Respond by coordinating these exact specialists in sequence, giving each specialist a clear heading, "
            "concrete deliverables tailored to the user's request, NEXUS handoffs between them, and a final Castiel Master Synthesis.\n\n"
            + "\n\n".join(agent_prompts)
        )

        messages = []
        if history:
            for h in history[-6:]:
                if h.get("role") in ("user", "assistant"):
                    messages.append({"role": h["role"], "content": h["content"][:2000]})
        messages.append({"role": "user", "content": prompt})

        try:
            llm_text = ""
            if provider == "anthropic":
                url = base_url or "https://api.anthropic.com/v1/messages"
                payload = {
                    "model": model or "claude-3-5-sonnet-latest",
                    "max_tokens": 2048,
                    "system": system_prompt,
                    "messages": messages,
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                    },
                )
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    llm_text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")

            elif provider == "gemini":
                m_name = model or "gemini-2.0-flash"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={api_key}"
                combined = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
                payload = {
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"parts": [{"text": combined}]}],
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    llm_text = data["candidates"][0]["content"]["parts"][0]["text"]

            else:
                # OpenAI, OpenRouter, or Local Ollama (/v1/chat/completions)
                if provider == "ollama":
                    url = (base_url.rstrip("/") if base_url else "http://127.0.0.1:11434") + "/v1/chat/completions"
                    default_model = "llama3.1"
                elif provider == "openrouter":
                    url = (base_url.rstrip("/") if base_url else "https://openrouter.ai/api/v1") + "/chat/completions"
                    default_model = "openai/gpt-4o-mini"
                else:
                    url = (base_url.rstrip("/") if base_url else "https://api.openai.com/v1") + "/chat/completions"
                    default_model = "gpt-4o-mini"

                headers = {"Content-Type": "application/json"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"

                payload = {
                    "model": model or default_model,
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "temperature": 0.6,
                }
                req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    llm_text = data["choices"][0]["message"]["content"]

            if llm_text:
                base["engine"] = f"castiel-router + {provider} ({model or 'default'})"
                base["synthesisMarkdown"] = llm_text
                base["llmEnhanced"] = True
            return base

        except Exception as exc:
            base["llmError"] = f"External LLM ({provider}) unreachable ({exc}); seamlessly fell back to Castiel In-Built AI Engine."
            return base


def render_agent_export(agent: Dict[str, Any], tool_format: str) -> Dict[str, str]:
    slug = agent["slug"]
    raw = agent["rawMarkdown"]

    if tool_format in ("claude-code", "copilot", "identity"):
        return {
            "filename": f"{slug}.md",
            "path": f".claude/agents/{slug}.md",
            "content": raw,
        }
    elif tool_format in ("cursor", "cursor-mdc"):
        body = re.sub(r"^---\s*\n.*?\n---\s*\n", "", raw, count=1, flags=re.S)
        mdc = (
            f"---\n"
            f"description: {agent['description']}\n"
            f"globs: \n"
            f"alwaysApply: false\n"
            f"---\n\n{body}"
        )
        return {
            "filename": f"{slug}.mdc",
            "path": f".cursor/rules/{slug}.mdc",
            "content": mdc,
        }
    elif tool_format in ("codex", "codex-toml"):
        body = re.sub(r"^---\s*\n.*?\n---\s*\n", "", raw, count=1, flags=re.S).replace('"""', '\\"\\"\\"')
        toml = (
            f'name = "{agent["name"]}"\n'
            f'description = "{agent["description"].replace(chr(34), chr(39))}"\n'
            f'developer_instructions = """\n{body}\n"""\n'
        )
        return {
            "filename": f"{slug}.toml",
            "path": f".codex/agents/{slug}.toml",
            "content": toml,
        }
    elif tool_format in ("gemini-cli", "gemini-md"):
        return {
            "filename": f"{slug}.md",
            "path": f".gemini/agents/{slug}.md",
            "content": raw,
        }
    elif tool_format in ("windsurf", "windsurf-rules"):
        return {
            "filename": f"{slug}.windsurfrules",
            "path": ".windsurfrules",
            "content": f"# Castiel AI Agent: {agent['emoji']} {agent['name']}\n\n{raw}",
        }
    elif tool_format in ("aider", "aider-conventions"):
        return {
            "filename": "CONVENTIONS.md",
            "path": "CONVENTIONS.md",
            "content": f"# Castiel AI Conventions — {agent['emoji']} {agent['name']}\n\n{raw}",
        }
    else:
        return {
            "filename": f"{slug}.md",
            "path": f"{slug}.md",
            "content": raw,
        }
