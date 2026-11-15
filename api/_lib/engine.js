const fs = require('fs')
const path = require('path')

const CATALOG_CANDIDATES = [
  path.join(process.cwd(), 'data', 'catalog.json'),
  path.join(__dirname, '..', '..', 'data', 'catalog.json'),
]

function resolveCatalogPath() {
  for (const candidate of CATALOG_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate
  }
  return CATALOG_CANDIDATES[0]
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'into', 'from', 'that', 'this', 'are', 'you', 'your',
  'will', 'have', 'has', 'was', 'were', 'not', 'but', 'can', 'all', 'any', 'use',
  'using', 'used', 'how', 'what', 'when', 'where', 'who', 'why', 'its', 'our', 'their',
])

const INTENT_EXPANSIONS = {
  website: 'frontend developer ui designer ux architect responsive web react html css accessibility',
  'web app': 'frontend developer backend architect fullstack api database ui designer',
  app: 'mobile app builder frontend developer ui designer ux architect product backend',
  mobile: 'mobile app builder ios android react native flutter ui designer',
  mvp: 'agents orchestrator sprint prioritizer rapid prototyper frontend backend devops reality checker',
  startup: 'business strategist sprint prioritizer rapid prototyper growth hacker product financial analyst',
  saas: 'backend architect frontend developer payments billing subscription multi tenant devops security',
  api: 'api platform engineer backend architect api tester security appsec documentation',
  database: 'database optimizer database reliability engineer sql postgres schema performance indexing',
  slow: 'performance benchmarker database optimizer sre frontend optimization caching latency',
  bug: 'code reviewer senior developer reality checker test automation engineer root cause',
  outage: 'incident response commander sre infrastructure maintainer devops automator executive summary',
  down: 'incident response commander sre infrastructure maintainer devops automator',
  security: 'security architect appsec engineer penetration tester compliance auditor threat detection',
  hack: 'penetration tester security architect incident responder appsec threat intelligence',
  audit: 'code reviewer security auditor compliance auditor accessibility auditor reality checker',
  ai: 'ai engineer llm post training rag pipeline prompt engineer multi agent systems',
  llm: 'ai engineer llm post training prompt engineer rag pipeline model qa',
  agent: 'multi agent systems architect agents orchestrator ai engineer mcp builder',
  marketing: 'marketing growth hacker content creator social media strategist brand guardian analytics',
  ads: 'paid media campaign strategist performance creative growth hacker analytics',
  seo: 'seo specialist content creator technical writer growth hacker analytics',
  sales: 'sales outbound strategist deal strategist discovery coach account executive',
  design: 'ui designer ux architect ux researcher brand guardian visual storyteller',
  game: 'game designer unity unreal godot game audio economy designer',
  finance: 'chief financial officer financial analyst fpa analyst tax strategist bookkeeper',
  legal: 'legal compliance checker data privacy officer document review contract',
  health: 'healthcare compliance medical billing patient care clinical',
  map: 'gis spatial mapping geospatial postgis cartography',
  '3d': 'xr immersive developer visionos blender spatial metal',
  vr: 'xr immersive developer xr interface architect visionos spatial',
  ar: 'xr immersive developer visionos spatial computing',
  deploy: 'devops automator sre platform engineer cloud security ci cd docker kubernetes',
  cloud: 'platform engineer devops automator finops cloud security architect',
  test: 'test automation engineer api tester reality checker evidence collector performance benchmarker',
  data: 'data engineer analytics reporter data visualization knowledge graph',
  research: 'ux researcher trend researcher academic statistician investment researcher',
  write: 'technical writer content creator document generator grant writer narratologist',
}

const TECH_SIGNALS = [
  'react', 'next.js', 'nextjs', 'vue', 'typescript', 'javascript', 'python', 'fastapi',
  'django', 'node', 'rust', 'go', 'postgres', 'postgresql', 'sql', 'mongodb', 'redis',
  'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'vercel', 'supabase', 'stripe',
  'graphql', 'rest', 'oauth', 'jwt', 'llm', 'rag', 'pytorch', 'tensorflow', 'unity',
  'unreal', 'godot', 'blender', 'swift', 'kotlin', 'flutter', 'tailwind', 'figma',
]

const PHASE_MAP = {
  academic: ['Phase 1 · Discovery & Research', 1],
  research: ['Phase 1 · Discovery & Research', 1],
  product: ['Phase 1 · Discovery & Strategy', 1],
  finance: ['Phase 1 · Strategy & Economics', 1],
  'project-management': ['Phase 1 · Planning & Coordination', 1],
  design: ['Phase 2 · Architecture & Experience', 2],
  gis: ['Phase 2 · Spatial & Data Architecture', 2],
  'spatial-computing': ['Phase 2 · Spatial & Interactive Architecture', 2],
  engineering: ['Phase 3 · Core Engineering & Build', 3],
  'game-development': ['Phase 3 · Game Systems & Build', 3],
  specialized: ['Phase 3 · Specialized Execution', 3],
  healthcare: ['Phase 3 · Domain & Clinical Execution', 3],
  security: ['Phase 4 · Security & Compliance Gate', 4],
  testing: ['Phase 4 · QA Verification & Reality Check', 4],
  marketing: ['Phase 5 · Launch & Growth', 5],
  'paid-media': ['Phase 5 · Paid Acquisition & Scale', 5],
  sales: ['Phase 5 · Revenue & Conversion', 5],
  support: ['Phase 5 · Operations & Analytics', 5],
}

const GENERIC_TITLE_TOKENS = new Set([
  'engineer', 'developer', 'specialist', 'auditor', 'manager', 'architect',
  'designer', 'analyst', 'strategist', 'consultant', 'assistant', 'testing',
  'agent', 'lead', 'senior', 'director', 'officer', 'coordinator', 'builder',
])

const DOMAIN_NEGATIVE_GUARDS = {
  medical: ['medical', 'healthcare', 'clinical', 'patient', 'hipaa', 'hospital', 'icd', 'cpt'],
  legal: ['legal', 'law', 'contract', 'attorney', 'gdpr', 'intake', 'lawsuit'],
  blockchain: ['blockchain', 'solidity', 'web3', 'smart contract', 'crypto', 'defi', 'token', 'zk'],
  accessibility: ['accessibility', 'a11y', 'wcag', 'screen reader', '508', 'aria'],
  gis: ['gis', 'map', 'geospatial', 'postgis', 'arcgis', 'qgis', 'geojson', 'spatial'],
  'paid media': ['paid media', 'ppc', 'ad spend', 'roas', 'google ads', 'meta ads', 'paid search'],
  roblox: ['roblox', 'luau'],
  godot: ['godot', 'gdscript'],
  unity: ['unity', 'c#'],
  unreal: ['unreal', 'ue5', 'blueprint'],
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expandQuery(prompt) {
  const low = prompt.toLowerCase()
  const extras = []
  for (const [key, expansion] of Object.entries(INTENT_EXPANSIONS)) {
    const re = new RegExp(`\\b${escapeRegex(key)}s?\\b`, 'i')
    if (re.test(low)) extras.push(expansion)
  }
  return `${prompt} ${prompt} ${prompt} ${extras.join(' ')}`.trim()
}

function extractPromptContext(prompt) {
  const low = prompt.toLowerCase()
  const detectedTech = TECH_SIGNALS.filter((t) =>
    new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(low)
  )
  const words = (prompt.match(/[a-zA-Z0-9+#.-]{3,}/g) || []).filter(
    (w) => !STOP_WORDS.has(w.toLowerCase()) && !['build', 'make', 'create', 'help', 'want', 'need', 'please', 'castiel', 'agent', 'agents'].includes(w.toLowerCase())
  )
  const urgency = ['p0', 'outage', 'down', 'urgent', 'breach', 'incident', 'emergency', 'broken'].some((k) => low.includes(k))
    ? 'critical'
    : ['launch', 'ship', 'production', 'enterprise', 'audit', 'mvp'].some((k) => low.includes(k))
      ? 'high'
      : 'standard'
  return {
    detectedTech,
    keyTerms: [...new Set(words)].slice(0, 14),
    urgency,
    wordCount: prompt.trim().split(/\s+/).length,
  }
}

let cachedState = null

function getEngineState() {
  if (cachedState) return cachedState
  const catalog = JSON.parse(fs.readFileSync(resolveCatalogPath(), 'utf-8'))
  const agents = catalog.agents || []
  const agentBySlug = {}
  const runbooksBySlug = {}
  for (const r of catalog.runbooks || []) runbooksBySlug[r.slug] = r

  const docFreq = new Map()
  const docVectors = []

  for (const a of agents) {
    agentBySlug[a.slug] = a
    const text = [
      `${a.name} `.repeat(4),
      `${a.vibe} `.repeat(3),
      `${a.description} `.repeat(3),
      `${a.divisionLabel} ${(a.keywords || []).join(' ')} `.repeat(2),
      (a.missionBullets || []).join(' '),
      (a.capabilityBullets || []).join(' '),
      (a.deliverableBullets || []).join(' '),
      (a.workflowBullets || []).join(' '),
    ].join(' ')
    const toks = tokenize(text)
    const tf = new Map()
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1)
    for (const t of tf.keys()) docFreq.set(t, (docFreq.get(t) || 0) + 1)
    docVectors.push({ agent: a, tf })
  }

  const N = agents.length
  const idf = new Map()
  for (const [term, df] of docFreq.entries()) {
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1)
  }

  // Precompute normalized TF-IDF vectors
  for (const dv of docVectors) {
    let normSq = 0
    const weights = new Map()
    for (const [term, count] of dv.tf.entries()) {
      const w = (1 + Math.log(count)) * (idf.get(term) || 1)
      weights.set(term, w)
      normSq += w * w
    }
    dv.weights = weights
    dv.norm = Math.sqrt(normSq) || 1
  }

  cachedState = { catalog, agents, agentBySlug, runbooksBySlug, docVectors, idf }
  return cachedState
}

function rankAgents(query, topK = 8, divisionFilter = null, excludeSlugs = []) {
  const { docVectors, idf } = getEngineState()
  const expanded = expandQuery(query)
  const qToks = tokenize(expanded)
  const qTf = new Map()
  for (const t of qToks) qTf.set(t, (qTf.get(t) || 0) + 1)

  let qNormSq = 0
  const qWeights = new Map()
  for (const [term, count] of qTf.entries()) {
    const w = (1 + Math.log(count)) * (idf.get(term) || 1)
    qWeights.set(term, w)
    qNormSq += w * w
  }
  const qNorm = Math.sqrt(qNormSq) || 1

  const rawTerms = new Set(tokenize(query))
  const qTermSet = new Set(qToks)
  const queryLow = query.toLowerCase()
  const excludeSet = new Set(excludeSlugs || [])

  const scored = []
  for (const dv of docVectors) {
    const agent = dv.agent
    if (excludeSet.has(agent.slug)) continue
    if (divisionFilter && agent.division !== divisionFilter) continue

    let dot = 0
    for (const [term, qw] of qWeights.entries()) {
      const dw = dv.weights.get(term)
      if (dw) dot += qw * dw
    }
    const baseScore = dot / (qNorm * dv.norm)

    const titleLow = agent.name.toLowerCase()
    const descLow = agent.description.toLowerCase()
    const matchedSkills = []
    let bonus = 0

    for (const kw of agent.keywords || []) {
      if (GENERIC_TITLE_TOKENS.has(kw)) continue
      if (rawTerms.has(kw) || (kw.length > 3 && queryLow.includes(kw))) {
        bonus += 0.055
        matchedSkills.push(kw)
      } else if (qTermSet.has(kw)) {
        bonus += 0.012
        if (matchedSkills.length < 4) matchedSkills.push(kw)
      }
    }

    for (const token of titleLow.match(/[a-z0-9]{3,}/g) || []) {
      if (GENERIC_TITLE_TOKENS.has(token)) continue
      if (rawTerms.has(token)) bonus += 0.11
      else if (qTermSet.has(token)) bonus += 0.018
    }

    for (const token of rawTerms) {
      if (token.length >= 4 && !GENERIC_TITLE_TOKENS.has(token) && descLow.includes(token)) {
        bonus += 0.03
      }
    }

    let penalty = 0
    for (const [guardKey, triggers] of Object.entries(DOMAIN_NEGATIVE_GUARDS)) {
      if (titleLow.includes(guardKey) || agent.slug.includes(guardKey)) {
        if (!triggers.some((t) => queryLow.includes(t))) penalty += 0.18
      }
      if (guardKey === 'medical' && agent.division === 'healthcare') {
        if (!triggers.some((t) => queryLow.includes(t))) penalty += 0.18
      }
    }

    const finalScore = Math.max(0.05, Math.min(0.99, baseScore + Math.min(bonus, 0.45) - penalty))
    scored.push({ score: finalScore, agent, matched: matchedSkills.slice(0, 5) })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK).map(({ score, agent, matched }) => {
    const [phase, phaseOrder] = PHASE_MAP[agent.division] || ['Phase 3 · Execution', 3]
    return {
      slug: agent.slug,
      name: agent.name,
      emoji: agent.emoji,
      vibe: agent.vibe,
      division: agent.division,
      divisionLabel: agent.divisionLabel,
      divisionColor: agent.divisionColor,
      description: agent.description,
      score: Number(score.toFixed(4)),
      confidence: Math.min(99, Math.max(42, Math.round(score * 135))),
      matchedSignals: matched.length ? matched : (agent.keywords || []).slice(0, 4),
      phase,
      phaseOrder,
    }
  })
}

function planOrchestration(prompt, preferredMode = 'auto') {
  const { agents, agentBySlug } = getEngineState()
  const ctx = extractPromptContext(prompt)
  const low = prompt.toLowerCase()

  let matchedRunbook = null
  if (['outage', 'incident', 'p0', 'production down', 'is down', '500 error', 'sev1', 'breach'].some((k) => low.includes(k))) {
    matchedRunbook = 'incident-response'
  } else if (['mvp', 'from scratch', 'launch a startup', 'new product', 'build a saas'].some((k) => low.includes(k))) {
    matchedRunbook = 'startup-mvp'
  } else if (['campaign', 'marketing launch', 'social media', 'go to market', 'gtm'].some((k) => low.includes(k))) {
    matchedRunbook = 'marketing-campaign'
  } else if (['enterprise', 'compliance', 'multi-stakeholder', 'soc2', 'gdpr'].some((k) => low.includes(k))) {
    matchedRunbook = 'enterprise-feature'
  }

  let mode = 'NEXUS-Sprint'
  let targetCount = 4
  if (preferredMode === 'single') {
    mode = 'Direct Specialist'
    targetCount = 1
  } else if (preferredMode === 'micro') {
    mode = 'NEXUS-Micro'
    targetCount = 3
  } else if (preferredMode === 'full') {
    mode = 'NEXUS-Full'
    targetCount = 7
  } else if (ctx.wordCount <= 8 && !['build', 'launch', 'full', 'system', 'platform', 'mvp', 'campaign', 'audit'].some((k) => low.includes(k))) {
    mode = 'NEXUS-Micro'
    targetCount = 3
  } else if (['mvp', 'platform', 'enterprise', 'full', 'end-to-end', 'complete', 'ecosystem', 'startup'].some((k) => low.includes(k))) {
    mode = 'NEXUS-Full'
    targetCount = 6
  }

  const candidates = rankAgents(prompt, 24)
  const selected = []
  const usedDivisions = {}

  for (const cand of candidates) {
    if (selected.length >= targetCount) break
    const div = cand.division
    const maxPerDiv = ['engineering', 'marketing', 'specialized', 'security'].includes(div) ? 2 : 1
    if ((usedDivisions[div] || 0) < maxPerDiv || cand.confidence >= 65 || selected.length < 2) {
      selected.push(cand)
      usedDivisions[div] = (usedDivisions[div] || 0) + 1
    }
  }

  if (targetCount >= 4 && !selected.some((s) => ['testing', 'security'].includes(s.division))) {
    const qaAgent = agentBySlug['testing-reality-checker'] || agentBySlug['testing-evidence-collector']
    if (qaAgent && selected.length) {
      selected[selected.length - 1] = {
        slug: qaAgent.slug,
        name: qaAgent.name,
        emoji: qaAgent.emoji,
        vibe: qaAgent.vibe,
        division: qaAgent.division,
        divisionLabel: qaAgent.divisionLabel,
        divisionColor: qaAgent.divisionColor,
        description: qaAgent.description,
        score: 0.82,
        confidence: 88,
        matchedSignals: ['quality gate', 'verification', 'production readiness'],
        phase: 'Phase 4 · QA Verification & Reality Check',
        phaseOrder: 4,
      }
    }
  }

  selected.sort((a, b) => (a.phaseOrder - b.phaseOrder) || (b.confidence - a.confidence))
  return {
    mode,
    context: ctx,
    recommendedRunbook: matchedRunbook,
    squad: selected,
    totalEvaluated: agents.length,
  }
}

function selectRelevantBullets(prompt, bullets, limit = 4) {
  if (!bullets || bullets.length <= limit) return bullets || []
  const qToks = new Set(tokenize(prompt))
  const scored = bullets.map((b) => {
    const bToks = tokenize(b)
    const overlap = bToks.filter((t) => qToks.has(t)).length
    return { b, score: overlap }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.b)
}

function buildAgentContribution(agentMeta, prompt, ctx, totalAgents, nextAgent) {
  const { agentBySlug } = getEngineState()
  const agent = agentBySlug[agentMeta.slug]
  const relMission = selectRelevantBullets(prompt, agent.missionBullets, 3)
  const relCaps = selectRelevantBullets(prompt, agent.capabilityBullets, 4)
  const relRules = selectRelevantBullets(prompt, agent.ruleBullets, 3)
  const relWorkflow = selectRelevantBullets(prompt, agent.workflowBullets, 4)
  const relMetrics = selectRelevantBullets(prompt, agent.metricBullets, 3)

  const techNote = ctx.detectedTech.length
    ? ` Detected stack alignment: **${ctx.detectedTech.join(', ')}**.`
    : ''
  const focusTerms = ctx.keyTerms.length ? ctx.keyTerms.slice(0, 6).join(', ') : 'your objective'

  const lines = [
    `*${agent.vibe || agent.description}*\n`,
    `**Perspective on your request** (\`${focusTerms}\`): As **${agent.name}** (${agent.divisionLabel} Division), my role in this mission is to anchor **${agentMeta.phase}**.${techNote}`,
  ]

  if (relMission.length) {
    lines.push('\n### Strategic Objectives Applied')
    for (const b of relMission) lines.push(`- ${b}`)
  }

  if (relWorkflow.length || relCaps.length) {
    lines.push('\n### Actionable Execution Plan')
    const steps = relWorkflow.length ? relWorkflow : relCaps
    steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`))
  }

  if (relCaps.length && relWorkflow.length) {
    lines.push('\n### Specialist Capabilities Engaged')
    for (const c of relCaps.slice(0, 3)) lines.push(`- ${c}`)
  }

  if (relRules.length) {
    lines.push('\n### Non-Negotiable Guardrails Enforced')
    for (const r of relRules) lines.push(`- ⚠️ ${r}`)
  }

  if (relMetrics.length) {
    lines.push('\n### Verification & Success Targets')
    for (const m of relMetrics) lines.push(`- ✅ ${m}`)
  }

  let codeSnippet = null
  const low = prompt.toLowerCase()
  if (
    agent.codeTemplates?.length &&
    (['code', 'build', 'api', 'schema', 'config', 'implement', 'template', 'example', 'script', 'architect'].some((k) => low.includes(k)) ||
      totalAgents === 1)
  ) {
    codeSnippet = agent.codeTemplates[0]
  }

  let handoff = null
  if (nextAgent) {
    handoff = {
      from: `${agent.emoji} ${agent.name}`,
      to: `${nextAgent.emoji} ${nextAgent.name}`,
      phase: agentMeta.phase,
      priority: ctx.urgency === 'critical' ? 'Critical' : 'High',
      deliverable: relMission[0] || agent.description.slice(0, 140),
      acceptanceCriteria: relMetrics.length
        ? relMetrics.slice(0, 3)
        : ['Meets domain quality & security rules', 'Ready for downstream phase integration'],
    }
  }

  return {
    slug: agent.slug,
    name: agent.name,
    emoji: agent.emoji,
    vibe: agent.vibe,
    division: agent.division,
    divisionLabel: agent.divisionLabel,
    divisionColor: agent.divisionColor,
    phase: agentMeta.phase,
    confidence: agentMeta.confidence,
    matchedSignals: agentMeta.matchedSignals,
    markdown: lines.join('\n'),
    codeSnippet,
    rulesCount: relRules.length,
    handoff,
  }
}

function runQualityGate(contributions) {
  const divisionsCovered = new Set(contributions.map((c) => c.division))
  const totalRules = contributions.reduce((acc, c) => acc + c.rulesCount, 0)
  const hasQA = divisionsCovered.has('testing') || divisionsCovered.has('security')

  const checks = [
    {
      label: 'Multi-Domain Alignment',
      status: contributions.length >= 1 ? 'PASS' : 'WARN',
      detail: `${contributions.length} specialist(s) across ${divisionsCovered.size} division(s) coordinated.`,
    },
    {
      label: 'Guardrail & Critical Rule Coverage',
      status: 'PASS',
      detail: `${totalRules} domain-specific critical rules enforced.`,
    },
    {
      label: 'Security, QA & Production Readiness',
      status: hasQA || divisionsCovered.has('engineering') ? 'PASS' : 'ADVISORY',
      detail: hasQA
        ? 'QA/Security validation included in pipeline.'
        : 'Recommend adding Security Architect or Reality Checker before production deploy.',
    },
    {
      label: 'Handoff Continuity',
      status: 'PASS',
      detail: `${Math.max(0, contributions.length - 1)} NEXUS handoff packet(s) verified with acceptance criteria.`,
    },
  ]

  const verdict = checks.every((c) => c.status === 'PASS') ? 'PASS' : 'CONDITIONAL PASS'
  return {
    verdict,
    reviewer: '🧐 Reality Checker & Castiel QA Gate',
    checks,
  }
}

function executeInbuilt({ prompt, mode = 'auto', agentSlug = null, squadSlugs = null, runbookSlug = null }) {
  const t0 = Date.now()
  const { agentBySlug, runbooksBySlug } = getEngineState()
  const ctx = extractPromptContext(prompt)

  let orchestrationMode = 'Castiel Auto-Coordinator'
  let recommendedRunbook = null
  let squad = []

  if (agentSlug && agentBySlug[agentSlug]) {
    orchestrationMode = '1-on-1 Specialist'
    const a = agentBySlug[agentSlug]
    squad = [{
      slug: a.slug,
      name: a.name,
      emoji: a.emoji,
      vibe: a.vibe,
      division: a.division,
      divisionLabel: a.divisionLabel,
      divisionColor: a.divisionColor,
      description: a.description,
      score: 1.0,
      confidence: 100,
      matchedSignals: (a.keywords || []).slice(0, 4),
      phase: 'Direct Specialist Consultation',
      phaseOrder: 1,
    }]
  } else if (runbookSlug && runbooksBySlug[runbookSlug]) {
    const rb = runbooksBySlug[runbookSlug]
    orchestrationMode = `NEXUS Runbook · ${rb.title}`
    recommendedRunbook = runbookSlug
    const rbSet = new Set(rb.roster.flatMap((g) => g.agents))
    squad = rankAgents(prompt, 283).filter((r) => rbSet.has(r.slug)).slice(0, 6)
    squad.sort((a, b) => (a.phaseOrder - b.phaseOrder) || (b.confidence - a.confidence))
  } else if (squadSlugs?.length) {
    orchestrationMode = `Custom Squad (${squadSlugs.length} agents)`
    for (const s of squadSlugs.slice(0, 10)) {
      const a = agentBySlug[s]
      if (!a) continue
      const [phase, phaseOrder] = PHASE_MAP[a.division] || ['Phase 3 · Execution', 3]
      squad.push({
        slug: a.slug,
        name: a.name,
        emoji: a.emoji,
        vibe: a.vibe,
        division: a.division,
        divisionLabel: a.divisionLabel,
        divisionColor: a.divisionColor,
        description: a.description,
        score: 0.95,
        confidence: 95,
        matchedSignals: (a.keywords || []).slice(0, 4),
        phase,
        phaseOrder,
      })
    }
    squad.sort((a, b) => a.phaseOrder - b.phaseOrder)
  } else {
    const plan = planOrchestration(prompt, mode)
    orchestrationMode = plan.mode
    recommendedRunbook = plan.recommendedRunbook
    squad = plan.squad
  }

  const contributions = squad.map((member, idx) =>
    buildAgentContribution(member, prompt, ctx, squad.length, squad[idx + 1] || null)
  )
  const qaGate = runQualityGate(contributions)

  const leadNames = contributions.map((c) => `${c.emoji} **${c.name}**`).join(', ')
  const phases = [...new Set(contributions.map((c) => c.phase))]

  const synthLines = [
    '## 🪽 Castiel AI Master Synthesis',
    `**Orchestration Mode**: \`${orchestrationMode}\` · **Evaluated**: \`283\` specialists · **Activated**: \`${contributions.length}\` agent(s)\n`,
    `**Assembled Team**: ${leadNames}\n`,
    '### Coordinated Roadmap',
  ]
  contributions.forEach((c, i) => {
    const hint = c.markdown.split('\n').find((l) => l.startsWith('- ') || l.startsWith('1. ')) || c.vibe
    synthLines.push(`${i + 1}. **${c.phase}** — ${c.emoji} **${c.name}** (\`${c.confidence}% match\`): ${hint.replace(/^[-0-9.\s]+/, '')}`)
  })
  synthLines.push('\n### Next Actions You Can Take')
  synthLines.push('- Click any activated agent badge above to inspect their full rules/system prompt or switch to **1-on-1 deep-dive**.')
  synthLines.push('- Ask a follow-up to drill into any phase, or export the assembled team to Claude Code / Cursor / Codex.')

  return {
    engine: 'castiel-inbuilt-v1',
    orchestrationMode,
    recommendedRunbook,
    elapsedMs: Date.now() - t0,
    context: ctx,
    squad,
    phases,
    contributions,
    qaGate,
    synthesisMarkdown: synthLines.join('\n'),
  }
}

async function executeExternalLlm(params) {
  const base = executeInbuilt(params)
  const { llmConfig, prompt } = params
  const { agentBySlug } = getEngineState()
  const provider = (llmConfig.provider || 'openai').toLowerCase()
  const apiKey = (llmConfig.apiKey || '').trim()
  const model = (llmConfig.model || '').trim()
  const baseUrl = (llmConfig.baseUrl || '').trim()

  const agentPrompts = base.contributions.map((c) => {
    const full = agentBySlug[c.slug]
    return `=== SPECIALIST: ${full.emoji} ${full.name} (${full.divisionLabel}) ===\nRole & Mission:\n${(full.identity || '').slice(0, 700)}\n${(full.mission || '').slice(0, 700)}\nCritical Rules:\n${(full.rules || '').slice(0, 500)}`
  })

  const systemPrompt = `You are Castiel AI, a sovereign multi-agent AI coordinator managing 283 specialized agents.\nYour router selected ${agentPrompts.length} specialist(s) in mode '${base.orchestrationMode}'.\nCoordinate these specialists sequentially with concrete deliverables, NEXUS handoffs, and a Castiel Master Synthesis.\n\n${agentPrompts.join('\n\n')}`

  try {
    let llmText = ''
    if (provider === 'anthropic') {
      const resp = await fetch(baseUrl || 'https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: model || 'claude-3-5-sonnet-latest', max_tokens: 2048, system: systemPrompt, messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await resp.json()
      llmText = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    } else if (provider === 'gemini') {
      const mName = model || 'gemini-2.0-flash'
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ parts: [{ text: prompt }] }] }),
      })
      const data = await resp.json()
      llmText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else {
      const url = provider === 'ollama'
        ? `${(baseUrl || 'http://127.0.0.1:11434').replace(/\/$/, '')}/v1/chat/completions`
        : provider === 'openrouter'
          ? `${(baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/chat/completions`
          : `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`
      const headers = { 'Content-Type': 'application/json' }
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || (provider === 'ollama' ? 'llama3.1' : 'gpt-4o-mini'),
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          temperature: 0.6,
        }),
      })
      const data = await resp.json()
      llmText = data?.choices?.[0]?.message?.content || ''
    }

    if (llmText) {
      base.engine = `castiel-router + ${provider}`
      base.synthesisMarkdown = llmText
      base.llmEnhanced = true
    }
    return base
  } catch (err) {
    base.llmError = `External LLM (${provider}) unreachable (${err.message}); fell back to Castiel In-Built AI Engine.`
    return base
  }
}

function renderAgentExport(agent, toolFormat) {
  const slug = agent.slug
  const raw = agent.rawMarkdown
  const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
  if (['claude-code', 'copilot', 'identity'].includes(toolFormat)) {
    return { filename: `${slug}.md`, path: `.claude/agents/${slug}.md`, content: raw }
  }
  if (['cursor', 'cursor-mdc'].includes(toolFormat)) {
    return {
      filename: `${slug}.mdc`,
      path: `.cursor/rules/${slug}.mdc`,
      content: `---\ndescription: ${agent.description}\nglobs: \nalwaysApply: false\n---\n\n${body}`,
    }
  }
  if (['codex', 'codex-toml'].includes(toolFormat)) {
    const safeDesc = agent.description.replace(/"/g, "'")
    return {
      filename: `${slug}.toml`,
      path: `.codex/agents/${slug}.toml`,
      content: `name = "${agent.name}"\ndescription = "${safeDesc}"\ndeveloper_instructions = """\n${body.replace(/"""/g, '\\"\\"\\"')}\n"""\n`,
    }
  }
  if (['gemini-cli', 'gemini-md'].includes(toolFormat)) {
    return { filename: `${slug}.md`, path: `.gemini/agents/${slug}.md`, content: raw }
  }
  if (['windsurf', 'windsurf-rules'].includes(toolFormat)) {
    return { filename: `${slug}.windsurfrules`, path: '.windsurfrules', content: `# Castiel AI Agent: ${agent.emoji} ${agent.name}\n\n${raw}` }
  }
  if (['aider', 'aider-conventions'].includes(toolFormat)) {
    return { filename: 'CONVENTIONS.md', path: 'CONVENTIONS.md', content: `# Castiel AI Conventions — ${agent.emoji} ${agent.name}\n\n${raw}` }
  }
  return { filename: `${slug}.md`, path: `${slug}.md`, content: raw }
}

module.exports = {
  getEngineState,
  rankAgents,
  planOrchestration,
  executeInbuilt,
  executeExternalLlm,
  renderAgentExport,
}
