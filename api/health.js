// api/health.js  (CommonJS + CORS)
module.exports = (req, res) => {
  // CORS: open for testing; we can lock this down later
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    ok: true,
    route: 'health',
    time: new Date().toISOString()
  });
};
