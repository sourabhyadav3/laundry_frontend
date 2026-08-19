const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, 'src/utils/exportUtils.js'), 'utf8');
const lines = content.split('\n');

let start = -1;
lines.forEach((line, index) => {
  if (line.includes('generateInvoicePDF')) {
    start = index;
  }
});

if (start !== -1) {
  for (let i = start; i < start + 120; i++) {
    if (i < lines.length) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
} else {
  console.log('Not found');
}
