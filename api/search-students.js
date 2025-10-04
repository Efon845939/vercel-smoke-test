const { setCORS } = require("./_cors");
const { supabase } = require("./_db");

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ success:false, message:"Method not allowed" });

  try {
    const q = String((req.query && req.query.q) || "").trim();
    if (!q || q.length < 2) {
      return res.status(200).json({ success:true, items: [] });
    }
    // Search students by name (case-insensitive)
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("role", "student")
      .ilike("name", `%${q}%`)
      .limit(10);

    if (error) throw error;
    const names = (data || []).map(r => r.name).filter(Boolean);
    res.status(200).json({ success:true, items: names });
  } catch (err) {
    console.error("search-students error:", err);
    res.status(500).json({ success:false, message:"Search failed" });
  }
};
