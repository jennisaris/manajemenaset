import { readFileSync } from 'node:fs';
import readline from 'node:readline';
import { createReadStream } from 'node:fs';

const filePath = 'D:\\2026\\DIKTI\\APLIKASI MANAJEMEN ASET\\daftar-aset-Gedung dan Bangunan PTN.csv';

const fileStream = createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let lineCount = 0;
let headers = [];
const sampleRows = [];
const satkers = new Set();
const assetCodes = new Set();
let duplicatesCount = 0;

for await (const line of rl) {
  lineCount++;
  if (lineCount === 1) {
    headers = line.split(';').map(h => h.trim());
    continue;
  }
  
  const cols = line.split(';');
  if (cols.length < 5) continue;
  
  const kodeSatker = cols[2]?.trim() || '';
  const namaSatker = cols[3]?.trim() || '';
  const kodeBarang = cols[4]?.trim() || '';
  const nup = cols[5]?.trim() || '';
  const assetCode = `${kodeSatker}-${kodeBarang}-${nup}`;
  
  satkers.add(`${kodeSatker} - ${namaSatker}`);
  
  if (assetCodes.has(assetCode)) {
    duplicatesCount++;
  } else {
    assetCodes.add(assetCode);
  }
  
  if (sampleRows.length < 3) {
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx]?.trim();
    });
    sampleRows.push(rowObj);
  }
}

console.log(`Total Data Rows: ${lineCount - 1}`);
console.log(`Unique Satker/PTN count: ${satkers.size}`);
console.log(`Unique Asset Codes count: ${assetCodes.size}`);
console.log(`Duplicates Count: ${duplicatesCount}`);
console.log('\nSample Satkers:');
Array.from(satkers).slice(0, 10).forEach(s => console.log(' -', s));

console.log('\nSample Row 1:');
console.log(JSON.stringify(sampleRows[0], null, 2));
