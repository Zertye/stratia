const fs = require('fs');
const path = require('path');

const src = 'c:\\Users\\nael\\Desktop\\StartIA';
const dest = 'c:\\Users\\nael\\Desktop\\StartIA\\guides\\images';

const moves = [
  ["4. Importer l'extrait sur Flow.png", 'importer-flow.png'],
  ['7. Exporter.png', 'exporter.png'],
  ['8. Monter.png', 'monter.png']
];

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

for (const [from, to] of moves) {
  const srcPath = path.join(src, from);
  const destPath = path.join(dest, to);
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
    console.log(`Moved: ${from} → guides/images/${to}`);
  } else {
    console.log(`Not found: ${from}`);
  }
}

// List what's in guides/images now
console.log('\nFiles in guides/images:');
fs.readdirSync(dest).forEach(f => console.log(' ', f));
