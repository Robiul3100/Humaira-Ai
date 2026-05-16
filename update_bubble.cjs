const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const bubbleRegex = /m\.role === "user" \s*\? "bg-\[#1cb0f6\] text-white border-\[#1899d6\] rounded-br-\[4px\]" \s*: "bg-white text-slate-700 border-slate-200 rounded-bl-\[4px\]"/g;

const newBubbleRegex = `m.role === "user" 
                           ? \`\${activeModeTheme.primary} \${activeModeTheme.primaryBorder} text-white rounded-br-[4px]\` 
                           : "bg-white text-slate-700 border-slate-200 rounded-bl-[4px]"`;

code = code.replace(bubbleRegex, newBubbleRegex);

fs.writeFileSync('src/App.tsx', code);
