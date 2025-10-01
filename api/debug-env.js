// api/debug-env.js
module.exports = (req, res) => {
  res.status(200).json({
    has_cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
    has_api_key: !!process.env.CLOUDINARY_API_KEY,
    has_api_secret: !!process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || null
  });
};
