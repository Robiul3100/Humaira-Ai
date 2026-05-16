const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Insert activeModeTheme computation inside App
const appFuncStart = code.indexOf('export default function App() {');
const insertAfterState = code.indexOf('const scrollRef = useRef', appFuncStart);

const themeComputation = `  const activeModeTheme = mode && MODES[mode] ? MODES[mode].theme : {
      primary: "bg-slate-300", primaryHex: "#cbd5e1", primaryBorder: "border-slate-400", primaryBorderB: "border-b-slate-400", lightBg: "bg-slate-50", textLight: "text-slate-500", shadowHex: "#94a3b8", lightBgBorder: "border-slate-200", activeNav: "bg-slate-100 text-slate-600 border-slate-200"
  };\n\n`;

code = code.substring(0, insertAfterState) + themeComputation + code.substring(insertAfterState);

// Replace "আড্ডা শুরু করুন" button
const startChatBtn = /<button onClick=\{\(\) => \{ createNewChat\(\); setCurrentView\("chat"\); \}\} className="w-full bg-\[#58cc02\] text-white font-extrabold text-\[15px\] uppercase tracking-widest py-4 border-b-\[4px\] border-\[#58a700\] rounded-\[20px\] active:border-b-0 active:translate-y-\[4px\] transition-all flex items-center justify-center gap-2 mb-8">\s*আড্ডা শুরু করুন\s*<\/button>/;

const newStartChatBtn = `<button onClick={() => { if(mode) { createNewChat(); setCurrentView("chat"); } else { setCurrentView("prompts"); } }} className={cn("w-full text-white font-extrabold text-[15px] uppercase tracking-widest py-4 border-b-[4px] rounded-[20px] active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 mb-8", mode ? \`\${activeModeTheme.primary} \${activeModeTheme.primaryBorder}\` : "bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed")}>
                   {mode ? "আড্ডা শুরু করুন" : "আগে একটি মোড সিলেক্ট করুন"}
                </button>`;
code = code.replace(startChatBtn, newStartChatBtn);

// Also need to fix handleSendMessage where it creates a chat: 
// if mode wasn't provided, it shouldn't proceed.
code = code.replace(
  /if \(!currentChatId\) \{/,
  `if (!currentChatId) {
       if (!mode) return;`
);

// We should also replace the home page Heart logo with dynamic theme
const homeHeartRegex = /<div className="w-32 h-32 bg-\[#58cc02\] rounded-\[32px\] shadow-\[0_8px_0_#58a700\] flex items-center justify-center mb-8 relative border-4 border-white">[\s\S]*?<Heart className="w-16 h-16 text-white fill-current" \/>/;
const newHomeHeart = `<div className={cn("w-32 h-32 rounded-[32px] flex items-center justify-center mb-8 relative border-4 border-white", activeModeTheme.primary)} style={{ boxShadow: \`0 8px 0 \${activeModeTheme.shadowHex}\`}}>
                   {mode && MODES[mode] ? (() => { const Icon = MODES[mode].icon; return <Icon className="w-16 h-16 text-white" />; })() : <Heart className="w-16 h-16 text-white fill-current" />}`;
code = code.replace(homeHeartRegex, newHomeHeart);

// Top header humaira text and icons
code = code.replace(
  /<div className="w-8 h-8 rounded-full bg-\[#58cc02\] flex items-center justify-center text-white border-2 border-\[#58a700\]\/40">\s*<Heart className="w-4 h-4 fill-current" \/>\s*<\/div>\s*<div className="font-extrabold text-\[#58cc02\] text-xl tracking-tighter">humaira<\/div>/,
  `<div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white border-2", activeModeTheme.primary)} style={{borderColor: \`\${activeModeTheme.shadowHex}40\`}}>
                {mode && MODES[mode] ? (() => { const Icon = MODES[mode].icon; return <Icon className="w-4 h-4" />; })() : <Heart className="w-4 h-4 fill-current" />}
             </div>
             <div className={cn("font-extrabold text-xl tracking-tighter", activeModeTheme.textLight)}>humaira</div>`
);

// Assistant message avatar
code = code.replace(
  /<div className="w-11 h-11 rounded-full border-2 border-slate-200 shadow-sm shrink-0 mr-3 self-end flex items-center justify-center bg-\[#58cc02\] text-white overflow-hidden relative">[\s\S]*?<\/div>/g,
  `<div className={cn("w-11 h-11 rounded-full border-2 shadow-sm shrink-0 mr-3 self-end flex items-center justify-center text-white overflow-hidden relative", activeModeTheme.primaryBorder, activeModeTheme.primary)}>
    {mode && MODES[mode] ? (() => { const Icon = MODES[mode].icon; return <Icon className="w-6 h-6" />; })() : <Heart className="w-6 h-6" />}
</div>`
);

// Loading generating animation (same as above conceptually, let's catch it if it exists separately)
// The above regex with /g might catch both instances. Check visually.

// Send button
code = code.replace(
  /<button onClick=\{\(\) => handleSendMessage\(\)\} disabled=\{!inputValue\.trim\(\)\} className="w-\[52px\] h-\[52px\] shrink-0 bg-\[#58cc02\] disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 disabled:translate-y-\[4px\] disabled:border-b-0 text-white rounded-\[16px\] flex items-center justify-center font-bold border-b-\[4px\] border-\[#58a700\] active:border-b-0 active:translate-y-\[4px\] outline-none transition-all">/,
  `<button onClick={() => handleSendMessage()} disabled={!inputValue.trim()} className={cn("w-[52px] h-[52px] shrink-0 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 disabled:translate-y-[4px] disabled:border-b-0 text-white rounded-[16px] flex items-center justify-center font-bold border-b-[4px] active:border-b-0 active:translate-y-[4px] outline-none transition-all", activeModeTheme.primary, activeModeTheme.primaryBorder)}> `
);

// Send button when no mode - disable text input ?
const textAreaRegex = /<textarea([\s\S]*?)placeholder="হুমায়রাকে মেসেজ দিন..."([\s\S]*?)\/>/;
code = code.replace(textAreaRegex, `<textarea$1placeholder={mode ? "হুমায়রাকে মেসেজ দিন..." : "আগে একটি মোড সিলেক্ট করুন..."} disabled={!mode}$2/>`);

fs.writeFileSync('src/App.tsx', code);
