import json
import os
import pathlib
import re
import yaml
from typing import Any, Dict, List, Optional

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
REPO_ROOT = pathlib.Path(os.environ.get("AGENCY_AGENTS_REPO", str(BASE_DIR.parent / "agency-agents-repo")))
DATA_DIR = BASE_DIR / "data"
CATALOG_CACHE = DATA_DIR / "catalog.json"

SECTION_ALIASES = {
    "identity": ["identity", "role definition", "executive summary", "persona"],
    "mission": ["core mission", "mission", "purpose", "objectives"],
    "rules": ["critical rules", "rules", "guardrails", "constraints", "non-negotiable"],
    "capabilities": ["capabilities", "competencies", "domain expertise", "specialized skills", "tooling"],
    "deliverables": ["technical deliverables", "deliverable", "artifacts", "outputs"],
    "workflow": ["workflow", "process", "methodology", "decision framework", "execution"],
    "communication": ["communication style", "communication", "voice", "tone"],
    "metrics": ["success metrics", "metrics", "kpis", "verification"],
    "anti_patterns": ["when not to use", "anti-patterns", "out of scope"],
    "learning": ["learning & memory", "memory"],
}


def strip_emoji_prefix(text: str) -> str:
    return re.sub(r"^[\W_]+", "", text).strip().lower()


def classify_section(heading: str) -> str:
    clean = strip_emoji_prefix(heading)
    for key, keywords in SECTION_ALIASES.items():
        for kw in keywords:
            if kw in clean:
                return key
    return "other"


def extract_bullets(text: str, max_items: int = 12) -> List[str]:
    items: List[str] = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith(("- ", "* ", "• ")):
            item = re.sub(r"^[-*•]\s+", "", s).strip()
            if item and len(item) > 4:
                items.append(item)
        elif re.match(r"^\d+\.\s+", s):
            item = re.sub(r"^\d+\.\s+", "", s).strip()
            if item and len(item) > 4:
                items.append(item)
        if len(items) >= max_items:
            break
    return items


def extract_code_blocks(text: str, max_blocks: int = 3) -> List[Dict[str, str]]:
    blocks = []
    for m in re.finditer(r"```([a-zA-Z0-9_-]*)\n(.*?)```", text, re.S):
        lang = m.group(1) or "text"
        code = m.group(2).strip()
        if code and len(code) <= 3000:
            blocks.append({"lang": lang, "code": code})
        if len(blocks) >= max_blocks:
            break
    return blocks


def extract_keywords(name: str, division: str, description: str, body: str) -> List[str]:
    tokens = set()
    for part in re.split(r"[^a-zA-Z0-9+#.-]+", f"{name} {division} {description}".lower()):
        if len(part) >= 3 and part not in {"the", "and", "for", "with", "into", "from", "that", "this", "expert", "agent", "specialist"}:
            tokens.add(part)
    # Grab bolded terms in body (e.g., **React**, **OWASP**)
    for m in re.findall(r"\*\*([^*]{2,36})\*\*", body[:4000]):
        cleaned = m.strip().rstrip(":").lower()
        if 2 <= len(cleaned) <= 32 and not cleaned.startswith("you "):
            tokens.add(cleaned)
        if len(tokens) >= 24:
            break
    return sorted(tokens)[:24]


def parse_agent_file(md_path: pathlib.Path, division: str, div_meta: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    raw = md_path.read_text(encoding="utf-8", errors="replace")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if not m:
        return None
    fm = yaml.safe_load(m.group(1)) or {}
    body = m.group(2).strip()
    slug = md_path.stem
    rel_path = str(md_path.relative_to(REPO_ROOT))
    sub_parts = md_path.relative_to(REPO_ROOT / division).parts
    subdivision = sub_parts[0] if len(sub_parts) > 1 else None

    # Split body by H2 headings
    sections: Dict[str, List[Dict[str, str]]] = {}
    current_heading = "Overview"
    current_lines: List[str] = []

    def flush():
        content = "\n".join(current_lines).strip()
        if content:
            cat = classify_section(current_heading)
            sections.setdefault(cat, []).append({
                "heading": current_heading,
                "content": content,
            })

    for line in body.splitlines():
        if line.startswith("## "):
            flush()
            current_heading = line[3:].strip()
            current_lines = []
        else:
            current_lines.append(line)
    flush()

    def join_cat(cat: str) -> str:
        return "\n\n".join(s["content"] for s in sections.get(cat, []))

    identity_text = join_cat("identity")
    mission_text = join_cat("mission")
    rules_text = join_cat("rules")
    capabilities_text = join_cat("capabilities")
    deliverables_text = join_cat("deliverables")
    workflow_text = join_cat("workflow")
    communication_text = join_cat("communication")
    metrics_text = join_cat("metrics")
    anti_patterns_text = join_cat("anti_patterns")

    name = str(fm.get("name") or slug).strip()
    description = str(fm.get("description") or "").strip()
    emoji = str(fm.get("emoji") or "🤖").strip()
    vibe = str(fm.get("vibe") or "").strip()
    color = str(fm.get("color") or "blue").strip()

    return {
        "slug": slug,
        "name": name,
        "division": division,
        "divisionLabel": div_meta.get("label", division.title()),
        "divisionColor": div_meta.get("color", "#6366F1"),
        "divisionIcon": div_meta.get("icon", "Sparkles"),
        "subdivision": subdivision,
        "path": rel_path,
        "description": description,
        "emoji": emoji,
        "vibe": vibe,
        "color": color,
        "tools": fm.get("tools") or [],
        "keywords": extract_keywords(name, division, description, body),
        "identity": identity_text[:1800],
        "missionBullets": extract_bullets(mission_text, 10),
        "mission": mission_text[:2500],
        "ruleBullets": extract_bullets(rules_text, 10),
        "rules": rules_text[:2000],
        "capabilityBullets": extract_bullets(capabilities_text or deliverables_text, 12),
        "capabilities": (capabilities_text or deliverables_text)[:2500],
        "deliverableBullets": extract_bullets(deliverables_text, 10),
        "deliverables": deliverables_text[:2500],
        "workflowBullets": extract_bullets(workflow_text, 10),
        "workflow": workflow_text[:2500],
        "communicationStyle": communication_text[:1200],
        "metricBullets": extract_bullets(metrics_text, 8),
        "metrics": metrics_text[:1500],
        "antiPatterns": anti_patterns_text[:1000],
        "codeTemplates": extract_code_blocks(body, 2),
        "rawMarkdown": raw,
        "wordCount": len(body.split()),
    }


def load_catalog(force_rebuild: bool = False) -> Dict[str, Any]:
    if not force_rebuild and CATALOG_CACHE.exists():
        return json.loads(CATALOG_CACHE.read_text(encoding="utf-8"))

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    divisions_raw = json.loads((REPO_ROOT / "divisions.json").read_text(encoding="utf-8"))["divisions"]
    tools_raw = json.loads((REPO_ROOT / "tools.json").read_text(encoding="utf-8"))["tools"]
    runbooks_raw = json.loads((REPO_ROOT / "strategy" / "runbooks.json").read_text(encoding="utf-8"))["runbooks"]

    agents: List[Dict[str, Any]] = []
    division_counts: Dict[str, int] = {}

    for div_slug, div_meta in divisions_raw.items():
        div_dir = REPO_ROOT / div_slug
        count = 0
        if div_dir.exists():
            for md_path in sorted(div_dir.rglob("*.md")):
                parsed = parse_agent_file(md_path, div_slug, div_meta)
                if parsed:
                    agents.append(parsed)
                    count += 1
        division_counts[div_slug] = count

    # Load NEXUS playbooks
    playbooks = []
    pb_dir = REPO_ROOT / "strategy" / "playbooks"
    if pb_dir.exists():
        for pb_file in sorted(pb_dir.glob("*.md")):
            txt = pb_file.read_text(encoding="utf-8", errors="replace")
            title_m = re.search(r"^#\s+(.+)$", txt, re.M)
            playbooks.append({
                "slug": pb_file.stem,
                "title": title_m.group(1).strip() if title_m else pb_file.stem,
                "content": txt[:6000],
            })

    # Enrich runbooks with doc summaries
    for rb in runbooks_raw:
        doc_path = REPO_ROOT / rb["doc"]
        if doc_path.exists():
            rb["docContent"] = doc_path.read_text(encoding="utf-8", errors="replace")[:8000]

    divisions_list = [
        {
            "slug": slug,
            "label": meta["label"],
            "icon": meta["icon"],
            "color": meta["color"],
            "count": division_counts.get(slug, 0),
        }
        for slug, meta in divisions_raw.items()
    ]

    catalog = {
        "name": "Castiel AI",
        "sourceRepo": "https://github.com/msitarzewski/agency-agents",
        "totalAgents": len(agents),
        "totalDivisions": len(divisions_list),
        "divisions": divisions_list,
        "agents": agents,
        "runbooks": runbooks_raw,
        "playbooks": playbooks,
        "tools": tools_raw,
    }

    CATALOG_CACHE.write_text(json.dumps(catalog, ensure_ascii=False), encoding="utf-8")
    return catalog


if __name__ == "__main__":
    cat = load_catalog(force_rebuild=True)
    print(f"Built Castiel AI catalog: {cat['totalAgents']} agents across {cat['totalDivisions']} divisions.")
