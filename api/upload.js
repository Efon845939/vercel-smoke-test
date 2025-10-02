const { setCORS } = require('./_cors');
const cloudinary = require('cloudinary').v2;
const formidable = require('formidable');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
    });

    const studentName = (fields.studentName || 'Unknown').toString();
    const fileObj = files.projectFile || files.file || files.upload;
    const filepath =
      (fileObj && fileObj.filepath) ||
      (Array.isArray(fileObj) && fileObj[0] && fileObj[0].filepath);

    if (!filepath) {
      return res.status(400).json({ success: false, message: 'No file uploaded (field must be "projectFile")' });
    }
    
    const title = (fields.title || '').toString().trim();
    const folder = process.env.CLOUDINARY_FOLDER || 'steam4all';
    const result = await cloudinary.uploader.upload(filepath, {
      folder,
      resource_type: 'auto',
      context: { studentName, title }
    });

    res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      studentName
    });
  } catch (err) {
    console.error('upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};
