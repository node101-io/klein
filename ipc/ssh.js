const { ipcMain } = require('electron');
const { Client } = require('ssh2');

const conn = new Client();

ipcMain.handle('ssh:connect', (event, data) => {
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      conn.exec(
        `bash -c -l 'echo { "name": "$EXECUTE", "properly_installed": "$NODE_PROPERLY_INSTALLED" }'`,
        (err, stream) => {
          if (err) reject(err);

          let stdout = '';

          stream.on('data', data => {
            stdout += data;
          });

          stream.on('close', () => {
            resolve(stdout);
          });
      });
    });

    conn.on('error', err => reject(err));

    conn.connect(data);
  });
});

ipcMain.handle('ssh:disconnect', (event, data) => {
  return new Promise((resolve, reject) => {
    conn.end();
    resolve();
  });
});

ipcMain.handle('ssh:exec', (event, data) => {
  return new Promise((resolve, reject) => {
    conn.exec(
      data.command,
      (err, stream) => {
        if (err) reject(err);

        let stdout = '';

        stream.on('data', data => {
          stdout += data;
        });

        stream.on('close', () => {
          resolve(stdout);
        });
      }
    );
  });
});
