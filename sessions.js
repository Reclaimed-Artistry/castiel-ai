module.exports = (req, res) => {
  // Stateless fallback for serverless deployment; client persists sessions in localStorage too.
  res.status(200).json({ sessions: [] })
}
