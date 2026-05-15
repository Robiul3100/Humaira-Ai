const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/shadow-sm/g, 'shadow-[0_4px_20px_rgba(244,114,182,0.08)] dark:shadow-[0_4px_20px_rgba(244,114,182,0.02)]');
content = content.replace(/shadow-md/g, 'shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)]');

fs.writeFileSync('src/App.tsx', content);
console.log('Replacements complete');
