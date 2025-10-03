// Body: { public_id: string, resource_type: "image"|"video", title: string }
// Updates ONLY the title context and returns the fresh title.

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
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

    const public_id = String(body.public_id || "").trim();
    const resource_type = (body.resource_type === "video") ? "video" : "image";
    const title = String(body.title || "").trim();
    if (!public_id || !title) return res.status(400).json({ success: false, message: "public_id and title are required" });

    await cloudinary.api.update(public_id, { resource_type, context: `title=${title}` });

    const fresh = await cloudinary.api.resource(public_id, { resource_type });
    const newTitle = fresh?.context?.custom?.title || null;

    return res.status(200).json({ success: !!newTitle, public_id, title: newTitle });
  } catch (err) {
    console.error("retitle error:", err);
    return res.status(500).json({ success: false, message: "Retitle failed" });
  }
};
