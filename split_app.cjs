const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const splitIndex = content.indexOf('// --- Render ---');
const logicPart = content.substring(0, splitIndex + 17);

fs.writeFileSync('src/logic.tsx', logicPart);
