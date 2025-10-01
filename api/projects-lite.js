// CommonJS on purpose (no package.json needed)
module.exports = (req, res) => {
  res.status(200).json({ success: true, route: 'projects-lite' });
};
