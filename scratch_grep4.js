const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, 'src/Pages/admin/MakeInvoice.jsx'), 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('showSettleModal') || line.includes('setShowSettleModal')) {
    console.log(`${index + 1}: ${line}`);
  }
});
