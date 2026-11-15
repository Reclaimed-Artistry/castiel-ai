const { rankAgents, planOrchestration } = require('./_lib/engine')

module.exports = (req, res) => {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const query = (body.query || '').trim()
  const division = body.division || null
  const topK = Math.min(Number(body.topK || 12), 40)
  if (!query) {
    return res.status(200).json({ results: [], plan: null })
  }
  res.status(200).json({
    results: rankAgents(query, topK, division),
    plan: planOrchestration(query),
  })
}
