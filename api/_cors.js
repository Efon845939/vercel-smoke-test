// CommonJS CORS helper
const ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Vary', 'Origin'); // so caches respect origin
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h
}

module.exports = { setCORS };
