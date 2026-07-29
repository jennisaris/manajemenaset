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

for await (const line of rl) {
  lineCount++;
  if (lineCount === 1) {
    headers = line.split(';');
  }
}

console.log(`Total Baris (termasuk header): ${lineCount}`);
console.log(`Jumlah Baris Data: ${lineCount - 1}`);
console.log(`Jumlah Kolom: ${headers.length}`);
console.log('Daftar Kolom:');
headers.forEach((h, idx) => console.log(`${idx + 1}. ${h.trim()}`));
