// Accepts multipart/form-data: studentName, title, makers (comma-separated), projectFile
// Persists metadata in Cloudinary context immediately.

const { setCORS } = require("./_cors");
const { getAuth } = require("./_jwt");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  try {
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
    });

    const studentName = String(fields.studentName || "Unknown").trim();
    const title = String(fields.title || "").trim();
    const makersRaw = fields.makers
      ? (Array.isArray(fields.makers) ? fields.makers.map(String).join(",") : String(fields.makers))
      : "";
    const makers = makersRaw.split(",").map(s => s.trim()).filter(Boolean); // ["a","b"]

    const fileObj = files.projectFile || files.file || files.upload;
    const filepath =
      (fileObj && fileObj.filepath) ||
      (Array.isArray(fileObj) && fileObj[0] && fileObj[0].filepath);

    if (!filepath) return res.status(400).json({ success: false, message: 'No file uploaded (field "projectFile")' });

    const folder = process.env.CLOUDINARY_FOLDER || "steam4all";

    // Save context as a STRING (most compatible with Cloudinary):
    // studentName=<name>|title=<title>|makers=<a|b|c>
    const ctx = [
      `studentName=${studentName}`,
      title ? `title=${title}` : null,
      makers.length ? `makers=${makers.join("|")}` : null
    ].filter(Boolean).join("|");

    const result = await cloudinary.uploader.upload(filepath, {
      folder,
      resource_type: "auto",
      context: ctx
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      studentName,
      title: title || null,
      makers
    });
  } catch (err) {
    console.error("upload error:", err);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
};
