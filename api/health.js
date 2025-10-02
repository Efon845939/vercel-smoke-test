// api/health.js  — force-open CORS so Squarespace can call it
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');          // <-- always allow for now
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');           // cache preflight for 24h

  if (req.method === 'OPTIONS') {
    res.status(204).end(); // no body
    return;
  }

  res.status(200).json({
    ok: true,
    route: 'health',
    originSeen: req.headers.origin || null,
    time: new Date().toISOString()
  });
};
