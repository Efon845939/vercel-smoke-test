// api/echo.js
module.exports = (req, res) => {
  res.status(200).json({ ok: true, route: 'echo', query: req.query || null });
};
