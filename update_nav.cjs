const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const navRegex = /<nav className="h-\[76px\] shrink-0 border-t-2 border-slate-200 bg-white flex items-center justify-around px-2 z-30">[\s\S]*?<\/nav>/;
const newNav = `<nav className="h-[76px] shrink-0 border-t-2 border-slate-200 bg-white flex items-center justify-around px-2 z-30">
           <button onClick={() => setCurrentView("home")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "home" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <Layers className={cn("w-[26px] h-[26px]", currentView === "home" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">শিখুন</span>
           </button>
           <button onClick={() => setCurrentView("chat")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "chat" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <MessageCircle className={cn("w-[26px] h-[26px]", currentView === "chat" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">চ্যাট</span>
           </button>
           <button onClick={() => setCurrentView("prompts")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "prompts" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <Sparkles className={cn("w-[26px] h-[26px]", currentView === "prompts" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">মোড</span>
           </button>
           <button onClick={() => setCurrentView("settings")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "settings" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <User className={cn("w-[26px] h-[26px]", currentView === "settings" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">প্রোফাইল</span>
           </button>
        </nav>`;

code = code.replace(navRegex, newNav);
fs.writeFileSync('src/App.tsx', code);
