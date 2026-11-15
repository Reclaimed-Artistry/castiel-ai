const { getEngineState } = require('./_lib/engine')

module.exports = (req, res) => {
  const { catalog } = getEngineState()
  res.status(200).json({
    status: 'ok',
    name: 'Castiel AI',
    engine: 'castiel-inbuilt-v1',
    totalAgents: catalog.totalAgents,
    totalDivisions: catalog.totalDivisions,
    runbooks: catalog.runbooks.length,
  })
}
