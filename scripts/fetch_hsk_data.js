const https = require('https');
const fs = require('fs');
const path = require('path');

const urls = {
  hsk2: 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/master/wordlists/exclusive/newest/2.json',
  hsk3: 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/master/wordlists/exclusive/newest/3.json'
};

const counts = {
  hsk2: 200, // 2026 standard
  hsk3: 500  // 2026 standard
};

function downloadAndSlice(level, url, count) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // The JSON is an array of objects
          const sliced = json.slice(0, count);
          
          const outDir = path.join(__dirname, '../data');
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir);
          }
          const outFile = path.join(outDir, `${level}.json`);
          fs.writeFileSync(outFile, JSON.stringify(sliced, null, 2));
          console.log(`Successfully fetched and sliced ${level} to ${sliced.length} words.`);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  await downloadAndSlice('hsk2', urls.hsk2, counts.hsk2);
  await downloadAndSlice('hsk3', urls.hsk3, counts.hsk3);
  console.log("Data acquisition complete!");
}

run();
