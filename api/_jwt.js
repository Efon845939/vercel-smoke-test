const jwt = require("jsonwebtoken");
const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}
function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}
function getAuth(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? verifyToken(m[1]) : null;
}
module.exports = { signToken, verifyToken, getAuth };
