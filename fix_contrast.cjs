const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Container background
code = code.replace('theme === "dark" ? "bg-[#111827] text-white"', 'theme === "dark" ? "bg-[#0b0f19] text-gray-50"');

// Header background
code = code.replace('theme === "dark" ? "border-gray-800 bg-[#111827]"', 'theme === "dark" ? "border-gray-800 bg-[#0b0f19]"');

// Removed

// User / AI message bubble background in dark mode
code = code.replace('theme === "dark" ? "bg-gray-800 text-gray-200 rounded-bl-[4px] shadow-sm border border-gray-700"', 'theme === "dark" ? "bg-gray-800 text-gray-50 rounded-bl-[4px] shadow-sm border border-gray-700"');

// Welcome text box background
code = code.replace('theme === "dark" ? "bg-gray-800 border-gray-700"', 'theme === "dark" ? "bg-gray-800 border-gray-700"'); // well, it's fine
code = code.replace('theme === "dark" ? "bg-gray-800"', 'theme === "dark" ? "bg-gray-800"');

fs.writeFileSync('src/App.tsx', code);
