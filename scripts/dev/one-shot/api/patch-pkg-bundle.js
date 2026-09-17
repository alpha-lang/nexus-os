const fs = require('fs');
const p = 'package.json';
const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));

if (!pkg.scripts['build:serverless']) {
  pkg.scripts['build:serverless'] = 'nest build && node build-serverless.js';
  console.log('  OK build:serverless ajoute');
} else {
  console.log('  SKIP deja present');
}

fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
