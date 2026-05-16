const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. systemInstruction cleanup
code = code.replace(/ইউজারের বর্তমান মুড: \$\{mood\}। /, '');

// 2. assistantMsg mood cleanup
code = code.replace(/,\n\s*mood: mood/, '');

// 3. Settings UI: Remove Humaira's Mood section completely
const moodSectionRegex = /<div className="p-5 border-b-2 border-slate-100">\s*<label className="text-slate-400 font-extrabold text-xs uppercase tracking-widest block mb-2">Humaira's Mood<\/label>[\s\S]*?<\/div>/;
code = code.replace(moodSectionRegex, '');

// Also need to fix where mode might be null in `systemInstruction` or chat creation
code = code.replace(
  /const chatSession = ai\.chats\.create\(\{/g,
  `if (!mode) return;\n      const chatSession = ai.chats.create({`
);

fs.writeFileSync('src/App.tsx', code);
