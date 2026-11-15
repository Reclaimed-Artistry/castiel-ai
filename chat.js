const crypto = require('crypto')
const { executeInbuilt, executeExternalLlm } = require('./_lib/engine')

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const prompt = (body.prompt || '').trim()
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  const params = {
    prompt,
    mode: body.mode || 'auto',
    agentSlug: body.agentSlug || null,
    squadSlugs: body.squadSlugs || null,
    runbookSlug: body.runbookSlug || null,
    llmConfig: body.llmConfig || null,
  }

  const result = params.llmConfig?.enabled
    ? await executeExternalLlm(params)
    : executeInbuilt(params)

  res.status(200).json({
    sessionId: body.sessionId || crypto.randomUUID(),
    messageId: crypto.randomUUID(),
    result,
  })
}
