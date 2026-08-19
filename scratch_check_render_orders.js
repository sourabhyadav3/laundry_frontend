const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.resolve(__dirname, 'src/Pages/admin/Orders.jsx'), 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('ReusableTable') || line.includes('OrderTable') || line.includes('Invoices Table') || line.includes('Orders Table') || line.includes('tableColumns')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
