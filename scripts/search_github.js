const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'api.github.com',
  path: '/search/repositories?q=hsk+3.0+json',
  headers: { 'User-Agent': 'NodeJS' }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data).items.slice(0, 3).map(i => i.full_name));
  });
}).on('error', console.error);
