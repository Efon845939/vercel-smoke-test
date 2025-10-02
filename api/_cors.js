// api/_cors.js
const RAW = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '*';
const ALLOWED = RAW.split(',').map(s => s.trim()).filter(Boolean);

function pickOrigin(req) {
  if (ALLOWED.includes('*')) return '*';
  const o = (req.headers.origin || '').trim();
  return ALLOWED.includes(o) ? o : null;
}
function setCORS(req, res) {
  const allow = pickOrigin(req);
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = { setCORS };
