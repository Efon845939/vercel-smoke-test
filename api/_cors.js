// CommonJS CORS helper that supports multiple origins (comma-separated)
const RAW = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '*';

// Normalize list
const ALLOWED = RAW.split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Return the origin to allow for this request
function pickOrigin(req) {
  // If wildcard, allow all
  if (ALLOWED.includes('*')) return '*';
  const reqOrigin = (req.headers.origin || '').trim();
  // Exact match only
  if (ALLOWED.includes(reqOrigin)) return reqOrigin;
  // Fallback: deny by returning empty (no header) or first allowed (safer to deny)
  return null;
}

function setCORS(req, res) {
  const allow = pickOrigin(req);
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h
}

module.exports = { setCORS };
