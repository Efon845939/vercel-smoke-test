// /api/_cors.js — UNBLOCK CORS (temporary wildcard)
// When stable, set FORCE_WILDCARD=false and use ALLOWED_ORIGINS env again.

const RAW = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "*";
const ALLOWED = RAW.split(",").map(s => s.trim()).filter(Boolean);

// 🔓 while you hurry, keep this true
const FORCE_WILDCARD = true;

function pickOrigin(req) {
  if (FORCE_WILDCARD) return "*";
  if (ALLOWED.includes("*")) return "*";
  const o = (req.headers.origin || "").trim();
  return ALLOWED.includes(o) ? o : null;
}

function setCORS(req, res) {
  const allow = pickOrigin(req);
  if (allow) {
    res.setHeader("Access-Control-Allow-Origin", allow);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "Access-Control-Allow-Origin");
  res.setHeader("Access-Control-Max-Age", "86400");
}

module.exports = { setCORS };
