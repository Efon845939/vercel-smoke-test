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
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

    const public_id = String(body.public_id || "").trim();
    const resource_type = body.resource_type === "video" ? "video" : "image";
    if (!public_id) return res.status(400).json({ success: false, message: "public_id is required" });

    const result = await cloudinary.uploader.destroy(public_id, { resource_type });
    return res.status(200).json({ success: result.result === "ok", result });
  } catch (err) {
    console.error("delete error:", err);
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
};
