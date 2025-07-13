// Existing uploadController code...

const fs = require('fs');
const path = require('path');

exports.getUploadStats = (req, res) => {
  const baseDir = path.join(__dirname, '../../uploads');

  const getStats = (folderPath) => {
    let count = 0;
    let totalSize = 0;

    if (!fs.existsSync(folderPath)) return { count, totalSize };

    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        count++;
        totalSize += stats.size;
      }
    });

    return { count, totalSize };
  };

  const folders = ['videos', 'images', 'documents'];
  const results = {};

  folders.forEach(folder => {
    const folderPath = path.join(baseDir, folder);
    results[folder] = getStats(folderPath);
  });

  res.json({ status: 'success', data: results });
};
