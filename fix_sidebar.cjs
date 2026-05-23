const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// For the sidebar drawer
code = code.split('theme === \\'dark\\' ? "bg-gray-900 border-r border-gray-800" : "bg-white border-r border-gray-200"').join('theme === \\'dark\\' ? "bg-[#111827] border-r border-gray-800" : "bg-white border-r border-gray-200"');

fs.writeFileSync('src/App.tsx', code);
