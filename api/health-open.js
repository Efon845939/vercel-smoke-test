// Always-open CORS health check to debug cross-origin issues quickly.
module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).end();

  res.status(200).json({
    ok: true,
    route: "health-open",
    originSeen: req.headers.origin || null,
    time: new Date().toISOString()
  });
};
