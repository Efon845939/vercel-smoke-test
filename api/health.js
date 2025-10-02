const { setCORS } = require('./_cors');

module.exports = (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    ok: true,
    route: 'health',
    time: new Date().toISOString()
  });
};
