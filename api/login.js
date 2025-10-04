const { setCORS } = require("./_cors");
const { signToken } = require("./_jwt");
const { verifyUser } = require("./_db");

const NAME_REGEX = /^([A-Za-zÇĞİÖŞÜçğıöşü]+)(\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)+$/;

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success:false, message:"Method not allowed" });

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

    const nameRaw = String(body.name || "");
    const role    = (body.role === "teacher") ? "teacher" : "student";
    const pin     = String(body.pin  || "").trim();

    if (!NAME_REGEX.test(nameRaw.trim())) {
      return res.status(400).json({
        success:false,
        message:"Please enter your full name (letters only, at least two words)."
      });
    }
    if (!pin) {
      return res.status(400).json({ success:false, message:"PIN is required." });
    }

    const row = await verifyUser(nameRaw, role);
    if (!row) return res.status(401).json({ success:false, message:"Invalid name or PIN" });

    const token = signToken({ name: row.name, role: row.role }); // exact case as stored
    res.status(200).json({ success:true, token, role: row.role, name: row.name });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ success:false, message:"Login failed" });
  }
};
