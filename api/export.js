const { getEngineState, renderAgentExport } = require('./_lib/engine')

module.exports = (req, res) => {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const slugs = body.slugs || []
  const format = body.format || 'claude-code'
  const { agentBySlug } = getEngineState()
  const files = []
  for (const s of slugs) {
    const agent = agentBySlug[s]
    if (agent) files.push(renderAgentExport(agent, format))
  }
  res.status(200).json({ format, files })
}
