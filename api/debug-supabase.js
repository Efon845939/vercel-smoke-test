// Quick live check for Supabase wiring from the browser.
const { setCORS } = require("./_cors");
const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE ? "present" : "missing";

  try {
    if (!url || key !== "present") {
      return res.status(200).json({
        ok: false,
        reason: "missing-env",
        supabase_url_present: !!url,
        service_role_present: key === "present"
      });
    }

    const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Try a lightweight select on users (table may be empty)
    const { data, error } = await sb.from("users").select("id").limit(1);
    if (error) {
      return res.status(200).json({ ok: false, reason: "query-error", error: String(error) });
    }

    return res.status(200).json({
      ok: true,
      reason: "connected",
      has_rows: Array.isArray(data) && data.length > 0
    });
  } catch (e) {
    return res.status(200).json({ ok: false, reason: "exception", error: String(e) });
  }
};
