const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the images with dicebear micah style
code = code.replace(
  /"https:\/\/images\.unsplash\.com\/photo-1518199268839-496c4df2d18f[\s\S]*?"/,
  '"https://api.dicebear.com/8.x/micah/svg?seed=Bella&backgroundColor=f43f5e,fecdd3"'
);

code = code.replace(
  /"https:\/\/images\.unsplash\.com\/photo-1545665277-50b91cb3feeb[\s\S]*?"/,
  '"https://api.dicebear.com/8.x/micah/svg?seed=Lola&backgroundColor=f59e0b,fde68a"'
);

code = code.replace(
  /"https:\/\/images\.unsplash\.com\/photo-1478059425650-dd1506458fe3[\s\S]*?"/,
  '"https://api.dicebear.com/8.x/micah/svg?seed=Oliver&backgroundColor=6366f1,e0e7ff"'
);

code = code.replace(
  /"https:\/\/images\.unsplash\.com\/photo-1455390582262-044cdead27d8[\s\S]*?"/,
  '"https://api.dicebear.com/8.x/micah/svg?seed=Jasper&backgroundColor=14b8a6,ccfbf1"'
);

code = code.replace(
  /"https:\/\/images\.unsplash\.com\/photo-1532094349884-543bc11b234d[\s\S]*?"/,
  '"https://api.dicebear.com/8.x/micah/svg?seed=Buster&backgroundColor=84cc16,d9f99d"'
);

code = code.replace(
  /"https:\/\/images\.unsplash\.com\/photo-1516589178581-6cd785311b52[\s\S]*?"/,
  '"https://api.dicebear.com/8.x/micah/svg?seed=Max&backgroundColor=3b82f6,dbeafe"'
);


// Replace layout styling
const startStr = '{currentView === "prompts" && (';
const endStr = '{currentView === "home" && (';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newPrompts = `{currentView === "prompts" && (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-center">
              <h2 className="text-[22px] sm:text-2xl font-extrabold text-slate-700 mb-1">খসড়া মোড</h2>
              <p className="text-slate-400 font-bold mb-4 sm:mb-6 text-[13px] sm:text-sm leading-snug">হুমায়রার জন্য একটি মোড বেছে নিন। এটি পুরো অ্যাপের থিম এবং তার স্বভাবে পরিবর্তন আনবে!</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-auto mb-auto">
                {(Object.entries(MODES) as [Mode, any][]).map(([key, modeData]) => {
                   const isSelected = mode === key;
                   return (
                     <button
                        key={key} 
                        onClick={() => { setMode(key as Mode); setCurrentView("home"); }}
                        className={cn(
                          "relative rounded-[16px] sm:rounded-[20px] border-2 overflow-hidden flex flex-col transition-all active:scale-95 group shadow-sm hover:shadow-md h-full",
                          isSelected 
                            ? \`\${modeData.theme.lightBg} \${modeData.theme.primaryBorder}\` 
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                        style={isSelected ? { outline: \`2px solid \${modeData.theme.shadowHex}\`, outlineOffset: '2px' } : {}}
                     >
                        <div className="w-full h-[90px] sm:h-[110px] bg-slate-100 flex-shrink-0 relative overflow-hidden">
                           <img src={modeData.image} alt={modeData.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                           {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md z-10">
                                 <Sparkles className={cn("w-3.5 h-3.5", modeData.theme.textLight)} />
                              </div>
                           )}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-2 sm:p-3 w-full flex-grow flex items-center justify-center border-t-2 border-slate-100/50">
                           <h3 className={cn("font-extrabold text-[13px] sm:text-[15px] leading-tight", isSelected ? modeData.theme.textLight : "text-slate-700")}>{modeData.label}</h3>
                        </div>
                     </button>
                   );
                })}
              </div>
            </div>
          )}

          `;

  code = code.substring(0, startIndex) + newPrompts + code.substring(endIndex);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced successfully");
} else {
  console.log("Error finding block bounds:", startIndex, endIndex);
}
