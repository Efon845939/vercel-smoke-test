const { setCORS } = require('./_cors');

module.exports = (req, res) => {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    ok: true,
    route: 'health',
    originSeen: req.headers.origin || null,
    time: new Date().toISOString()
  });
};
