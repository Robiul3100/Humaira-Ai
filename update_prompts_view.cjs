const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{currentView === "prompts" && \([\s\S]*?<div className="space-y-5">[\s\S]*?\{Object\.entries\(MODES\)\.map\(\(\[key, modeData\]\) => \([\s\S]*?<\/div>\s*<\/div>\s*\)\s*\)/;

const newPrompts = `{currentView === "prompts" && (
            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col">
              <h2 className="text-2xl font-extrabold text-slate-700 mb-2">খসড়া মোড</h2>
              <p className="text-slate-400 font-bold mb-6 text-sm">হুমায়রার জন্য একটি মোড বেছে নিন। এটি পুরো অ্যাপের থিম এবং তার স্বভাবে পরিবর্তন আনবে!</p>
              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(MODES) as [Mode, any][]).map(([key, modeData]) => {
                   const isSelected = mode === key;
                   return (
                     <button
                        key={key} 
                        onClick={() => { setMode(key); setCurrentView("home"); }}
                        className={cn(
                          "relative rounded-[20px] border-2 overflow-hidden flex flex-col transition-all active:scale-95 group shadow-sm hover:shadow-md",
                          isSelected 
                            ? \`\${modeData.theme.lightBg} \${modeData.theme.primaryBorder}\` 
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                        style={isSelected ? { outline: \`2px solid \${modeData.theme.shadowHex}\`, outlineOffset: '2px' } : {}}
                     >
                        <div className="w-full aspect-[4/5] bg-slate-100 relative overflow-hidden">
                           <img src={modeData.image} alt={modeData.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
                                 <Sparkles className={cn("w-3.5 h-3.5", modeData.theme.textLight)} />
                              </div>
                           )}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-3.5 w-full text-center border-t-2 border-slate-100/50">
                           <h3 className={cn("font-extrabold text-[15px]", isSelected ? modeData.theme.textLight : "text-slate-700")}>{modeData.label}</h3>
                        </div>
                     </button>
                   );
                })}
              </div>
            </div>
          )}`;

code = code.replace(regex, newPrompts);
fs.writeFileSync('src/App.tsx', code);
