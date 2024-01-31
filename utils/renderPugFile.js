const fs = require('fs');
const path = require('path');
const pug = require('pug');

const tempFilePath = path.join(__dirname, '../frontend/render/temp.html');

module.exports = (pugFile, locals, callback) => {
  const htmlContent = pug.renderFile(
    path.join(__dirname, `../frontend/views/${pugFile}.pug`),
    locals
  );

  fs.writeFile(tempFilePath, htmlContent, err => {
    if (err)
      return callback(err);

    return callback(null, tempFilePath);
  });
};