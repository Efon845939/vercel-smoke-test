// api/health.js  (CommonJS on purpose to avoid ESM surprises)
module.exports = (req, res) => {
  res.status(200).json({ ok: true, route: 'health', time: new Date().toISOString() });
};
