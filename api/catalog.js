const { getEngineState } = require('./_lib/engine')

module.exports = (req, res) => {
  const { catalog } = getEngineState()
  res.status(200).json({
    name: 'Castiel AI',
    sourceRepo: catalog.sourceRepo,
    totalAgents: catalog.totalAgents,
    totalDivisions: catalog.totalDivisions,
    divisions: catalog.divisions,
    runbooks: (catalog.runbooks || []).map((r) => ({
      slug: r.slug,
      title: r.title,
      mode: r.mode,
      duration: r.duration,
      summary: r.summary,
      roster: r.roster,
    })),
    playbooks: (catalog.playbooks || []).map((p) => ({ slug: p.slug, title: p.title })),
    tools: Object.entries(catalog.tools || {}).map(([k, v]) => ({
      kebab: k,
      label: v.label,
      short: v.short,
      accent: v.accent,
      format: v.format,
      installKind: v.installKind,
    })),
    agents: (catalog.agents || []).map((a) => ({
      slug: a.slug,
      name: a.name,
      division: a.division,
      divisionLabel: a.divisionLabel,
      divisionColor: a.divisionColor,
      divisionIcon: a.divisionIcon,
      subdivision: a.subdivision,
      description: a.description,
      emoji: a.emoji,
      vibe: a.vibe,
      color: a.color,
      keywords: a.keywords,
      wordCount: a.wordCount,
      missionPreview: (a.missionBullets || []).slice(0, 3),
      ruleCount: (a.ruleBullets || []).length,
      capabilityCount: (a.capabilityBullets || []).length,
    })),
  })
}
