const { setCORS } = require("./_cors");
const { signToken } = require("./_jwt");
const { verifyUser } = require("./_db");

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success:false, message:"Method not allowed" });

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

    const name = String(body.name || "").trim();
    const role = (body.role === "teacher") ? "teacher" : "student";
    const pin  = String(body.pin  || "").trim();
    if (!name || !pin) return res.status(400).json({ success:false, message:"name and pin required" });

    const row = await verifyUser(name, role, pin);
    if (!row) return res.status(401).json({ success:false, message:"Invalid name or PIN" });

    const token = signToken({ name: row.name, role: row.role });
    res.status(200).json({ success:true, token, role: row.role, name: row.name });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ success:false, message:"Login failed", debug: String(err.message || err) });
  }
};
