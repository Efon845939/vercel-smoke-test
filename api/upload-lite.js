// CommonJS; simple GET so you can hit it from the browser
module.exports = (req, res) => {
  res.status(200).json({ success: true, route: 'upload-lite' });
};
