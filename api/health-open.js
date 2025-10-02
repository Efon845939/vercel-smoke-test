// api/health-open.js  (CommonJS) — ALWAYS sends CORS so we can verify end-to-end
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');      // allow all for this test
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    ok: true,
    route: 'health-open',
    originSeen: req.headers.origin || null,
    time: new Date().toISOString()
  });
};
