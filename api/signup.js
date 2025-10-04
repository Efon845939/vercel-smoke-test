const { setCORS } = require("./_cors");
const { signToken } = require("./_jwt");
const { createUser, getUserByNameRole } = require("./_db");

const TEACHER_ACCESS_CODE = process.env.TEACHER_ACCESS_CODE || "StEaM4AlL";
// Letters-only (incl. Turkish) & spaces; at least two words
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
    const teacherCode = String(body.teacherCode || "").trim();

    // Validation: letters-only + full name (>=2 words)
    if (!NAME_REGEX.test(nameRaw.trim())) {
      return res.status(400).json({
        success:false,
        message:"Please enter your full name (letters only, at least two words)."
      });
    }
    if (!pin) {
      return res.status(400).json({ success:false, message:"PIN is required." });
    }
    if (role === "teacher" && teacherCode !== TEACHER_ACCESS_CODE) {
      return res.status(401).json({ success:false, message:"Invalid Teacher Access Code." });
    }

    // Case-sensitive storage, but case-insensitive uniqueness
    const exists = await getUserByNameRole(nameRaw, role);
    if (exists) return res.status(409).json({ success:false, message:"User already exists. Please log in." });

    const row = await createUser(nameRaw, role, pin);
    const token = signToken({ name: row.name, role: row.role }); // store as typed

    res.status(200).json({ success:true, token, role: row.role, name: row.name });
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ success:false, message:"Signup failed" });
  }
};
