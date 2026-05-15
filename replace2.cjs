const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/rgba\(99,102,241/g, 'rgba(244,114,182'); // indigo to pink
content = content.replace(/rgba\(165,180,252/g, 'rgba(244,114,182'); // light indigo to pink
content = content.replace(/rgba\(168,85,247/g, 'rgba(236,72,153'); // purple to pink

fs.writeFileSync('src/App.tsx', content);
console.log('Replacements complete');
