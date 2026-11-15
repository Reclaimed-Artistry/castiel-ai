const { getEngineState } = require('../_lib/engine')

module.exports = (req, res) => {
  const { slug } = req.query
  const { agentBySlug } = getEngineState()
  const agent = agentBySlug[slug]
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }
  res.status(200).json(agent)
}
