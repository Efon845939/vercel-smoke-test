// api/upload.js  (CommonJS)
// Accepts multipart/form-data: fields => studentName, file => projectFile
// Returns: { success, url, public_id, studentName }

const cloudinary = require('cloudinary').v2;
const formidable = require('formidable');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// IMPORTANT for Next.js API routes; harmless here on Vercel functions:
module.exports.config = {
  api: { bodyParser: false }
};

module.exports = async (req, res) => {
  // CORS (open for testing; we can lock to your Squarespace domain later)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const form = new formidable.IncomingForm({
      multiples: false,
      keepExtensions: true
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
    });

    const studentName = (fields.studentName || 'Unknown').toString();

    // Support several common field names just in case
    const fileObj = files.projectFile || files.file || files.upload;

    // formidable v3 may return a File or an array of Files
    const filepath =
      (fileObj && fileObj.filepath) ||
      (Array.isArray(fileObj) && fileObj[0] && fileObj[0].filepath);

    if (!filepath) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Make sure your file input name is "projectFile".'
      });
    }

    const folder = process.env.CLOUDINARY_FOLDER || 'steam4all';

    const result = await cloudinary.uploader.upload(filepath, {
      folder,
      resource_type: 'auto',     // images or videos
      context: { studentName }   // store who uploaded it
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      studentName
    });
  } catch (err) {
    console.error('upload error:', err);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};
