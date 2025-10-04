// TEMPORARY: open CORS to unblock (we'll tighten back later)
// CommonJS CORS helper with debug header so you can see what's happening from the browser.

const RAW = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "*";

// Normalize list for later re-tightening
const ALLOWED = RAW.split(",").map(s => s.trim()).filter(Boolean);

// ---- CONFIG: while debugging, we force wildcard. Change to `false` to enforce allow list later.
const FORCE_WILDCARD = true;

function pickOrigin(req) {
  if (FORCE_WILDCARD) return "*"; // <-- DEBUG/UNBLOCK MODE
  if (ALLOWED.includes("*")) return "*";

  const reqOrigin = (req.headers.origin || "").trim();
  if (!reqOrigin) return null;

  // Exact match only
  if (ALLOWED.includes(reqOrigin)) return reqOrigin;

  return null;
}

function setCORS(req, res) {
  const allow = pickOrigin(req);

  if (allow) {
    res.setHeader("Access-Control-Allow-Origin", allow);
    res.setHeader("Vary", "Origin");
  }
  // Allow the common verbs we use
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  // Allow JSON, Auth header, and form-data preflights
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Authorization");
  // Let the browser read these response headers (helpful for debugging)
  res.setHeader("Access-Control-Expose-Headers", "Access-Control-Allow-Origin, X-CORS-Debug");
  // Cache preflight for 24h
  res.setHeader("Access-Control-Max-Age", "86400");

  // Helpful debug header you can read in fetch()
  res.setHeader(
    "X-CORS-Debug",
    JSON.stringify({
      originSeen: (req.headers.origin || null),
      allowedList: ALLOWED,
      forcedWildcard: FORCE_WILDCARD
    })
  );
}

module.exports = { setCORS };
