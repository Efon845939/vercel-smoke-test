// Lists uploaded assets, optionally filtered by ?studentName=... (case-insensitive).
// Uses Admin API for fresh results and returns title + makers.

const { setCORS } = require("./_cors");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Method not allowed" });

  try {
    const folder = process.env.CLOUDINARY_FOLDER || "steam4all";
    const qName = (req.query && req.query.studentName ? String(req.query.studentName) : "").trim().toLowerCase();

    const imgs = await cloudinary.api.resources({
      type: "upload",
      prefix: `${folder}/`,
      max_results: 100,
      resource_type: "image"
    });
    const vids = await cloudinary.api.resources({
      type: "upload",
      prefix: `${folder}/`,
      max_results: 100,
      resource_type: "video"
    });

    let resources = (imgs.resources || []).concat(vids.resources || []);
    resources.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    let items = resources.map(r => {
      const ctx = r.context && r.context.custom ? r.context.custom : {};
      const makers = ctx.makers ? String(ctx.makers).split("|").filter(Boolean) : [];
      return {
        public_id: r.public_id,
        url: r.secure_url,
        format: r.format,
        resource_type: r.resource_type,
        bytes: r.bytes,
        created_at: r.created_at,
        studentName: ctx.studentName || null,
        title: ctx.title || null,
        makers
      };
    });

    if (qName) {
      items = items.filter(i => {
        const me = qName;
        return (i.studentName || "").toLowerCase() === me || (i.makers || []).map(m => m.toLowerCase()).includes(me);
      });
    }

    return res.status(200).json({ success: true, count: items.length, items });
  } catch (err) {
    console.error("projects fatal error:", err);
    return res.status(500).json({ success: false, message: "Could not list projects" });
  }
};
