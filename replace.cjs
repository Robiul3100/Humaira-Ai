const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add italic to titles using font-display
content = content.replace(/font-display font-semibold/g, 'font-display italic font-semibold');
content = content.replace(/font-display font-bold/g, 'font-display italic font-bold');
content = content.replace(/font-display font-black/g, 'font-display italic font-black');

// Round elements more aggressively
content = content.replace(/rounded-2xl/g, 'rounded-[2rem]');
content = content.replace(/rounded-3xl/g, 'rounded-[2.5rem]');
content = content.replace(/rounded-\[28px\]/g, 'rounded-[2.5rem]');

// Enhance shadow for a softer blur
content = content.replace(/shadow-sm/g, 'shadow-md shadow-rose-100/50 dark:shadow-none');

fs.writeFileSync('src/App.tsx', content);
console.log('Replacements complete');
