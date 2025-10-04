const { setCORS } = require("./_cors");
const { getAuth } = require("./_jwt");
const { getUserByNameRole } = require("./_db");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const NAME_REGEX = /^([A-Za-zÇĞİÖŞÜçğıöşü]+)(\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)+$/;

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success:false, message:"Method not allowed" });

  try {
    const auth = getAuth(req);
    if (!auth || !auth.name || auth.role !== "student") {
      return res.status(401).json({ success:false, message:"Please sign in as a student to upload." });
    }

    const form = new formidable.IncomingForm({ multiples:false, keepExtensions:true });
    const { fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })))
    );

    const uploaderName = String(auth.name); // exact stored case
    const title  = String(fields.title || "").trim();
    const makersRaw = String(fields.makers || "");
    const makersRequested = makersRaw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    // Validate title (optional) and makers names
    // Validate makers: must exist as students in roster AND match full-name pattern
    const makersValid = [];
    for (const m of makersRequested) {
      if (!NAME_REGEX.test(m)) continue; // must be full name, letters only
      const row = await getUserByNameRole(m, "student");
      if (row) makersValid.push(row.name); // store exact case as in DB
    }

    const fileObj = files.projectFile || files.file || files.upload;
    const filepath =
      (fileObj && fileObj.filepath) ||
      (Array.isArray(fileObj) && fileObj[0] && fileObj[0].filepath);
    if (!filepath) return res.status(400).json({ success:false, message:'No file uploaded (field "projectFile")' });

    const folder = process.env.CLOUDINARY_FOLDER || "steam4all";
    const ctx = [
      `studentName=${uploaderName}`,
      title ? `title=${title}` : null,
      makersValid.length ? `makers=${makersValid.join("|")}` : null
    ].filter(Boolean).join("|");

    const result = await cloudinary.uploader.upload(filepath, {
      folder,
      resource_type: "auto",
      context: ctx
    });

    res.status(200).json({
      success:true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      studentName: uploaderName,
      title: title || null,
      makers: makersValid
    });
  } catch (err) {
    console.error("upload error:", err);
    res.status(500).json({ success:false, message:"Upload failed" });
  }
};
