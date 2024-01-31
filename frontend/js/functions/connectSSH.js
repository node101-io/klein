const connectSSH = (data, callback) => {
  if (!data || typeof data !== 'object')
    return callback('bad_request');

  if (!data.host || typeof data.host !== 'string' || !data.host.match(/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/g))
    return callback('bad_request');

  if (!data.password || typeof data.password !== 'string')
    return callback('bad_request');

  loading.show();

  ipcRenderer.invoke('ssh:connect', {
    host: data.host,
    password: data.password,
    username: 'root',
  })
    .then(res => {
      callback(null, res);
    })
    .catch(err => {
      callback(err);
    });
};
  