// api/signup.js
// POST { name, role, pin } -> { success, token, role, name }
// Creates user if not exists; role: "student" | "teacher"

const { setCORS } = require("./_cors");
const { signToken } = require("./_jwt");
const { createUser, getUserByNameRole } = require("./_db");

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

    const exists = await getUserByNameRole(name, role);
    if (exists) return res.status(409).json({ success:false, message:"User already exists. Please log in." });

    const row = await createUser(name, role, pin);
    const token = signToken({ name: row.name, role: row.role });

    res.status(200).json({ success:true, token, role: row.role, name: row.name });
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ success:false, message:"Signup failed" });
  }
};
