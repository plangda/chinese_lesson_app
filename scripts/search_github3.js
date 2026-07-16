const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/drkameleon/complete-hsk-vocabulary/contents/wordlists',
  headers: { 'User-Agent': 'NodeJS' }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data).map(i => i.name));
  });
}).on('error', console.error);
