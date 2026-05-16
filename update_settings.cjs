const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const startStr = '{currentView === "settings" && (';
const endStr = '{currentView === "prompts" && (';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newSettings = `{currentView === "settings" && (
            <div className="flex-1 overflow-y-auto px-5 py-6">
              
              <div className="text-center mb-6">
                 <h2 className="text-2xl font-extrabold text-slate-700">প্রোফাইল</h2>
              </div>

              {/* User Gamification & Info Section */}
              <div className="bg-white rounded-[24px] border-2 border-slate-200 p-5 mb-6 flex flex-col items-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#1cb0f6]/10 to-transparent"></div>
                
                <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-50 flex items-center justify-center overflow-hidden mb-4 z-10">
                    {userProfilePic ? <img src={userProfilePic} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
                    <label className="absolute bottom-0 inset-x-0 h-8 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                </div>
                
                <h2 className="text-xl font-extrabold text-slate-700 z-10">{userName}</h2>
                <p className="text-slate-400 font-bold text-sm mb-6 z-10">যোগ দিয়েছেন: মে ২০২৬</p>

                <div className="w-full grid grid-cols-2 gap-4 z-10">
                    <div className="rounded-[16px] border-2 border-amber-200 bg-amber-50 p-4 flex flex-col items-center gap-1">
                        <Flame className="w-8 h-8 text-amber-500 fill-amber-500" />
                        <span className="font-extrabold text-amber-600 text-[22px]">১২</span>
                        <span className="text-amber-500/80 font-bold text-xs uppercase tracking-widest text-center mt-1">দিনের স্ট্রিক</span>
                    </div>
                    <div className="rounded-[16px] border-2 border-[#1cb0f6]/20 bg-[#1cb0f6]/10 p-4 flex flex-col items-center gap-1">
                        <Zap className="w-8 h-8 text-[#1cb0f6] fill-[#1cb0f6]" />
                        <span className="font-extrabold text-[#1cb0f6] text-[22px]">১,২৫০</span>
                        <span className="text-[#1cb0f6]/80 font-bold text-xs uppercase tracking-widest text-center mt-1">মোট এক্সপি</span>
                    </div>
                </div>
              </div>

              {/* Achievements Section */}
              <div className="mb-8">
                  <div className="flex items-center justify-between mb-4 px-1">
                      <h3 className="text-slate-700 font-extrabold text-lg">অর্জনসমূহ</h3>
                      <button className="text-[#1cb0f6] font-bold text-sm uppercase tracking-wider">সব দেখুন</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 shrink-0 px-1 snap-x no-scrollbar">
                      <div className="min-w-[124px] rounded-[20px] border-2 border-slate-200 bg-white p-4 flex flex-col items-center gap-3 snap-center shadow-sm">
                          <div className="w-[52px] h-[52px] rounded-full bg-amber-100 flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-amber-500" />
                          </div>
                          <span className="font-bold text-slate-700 text-sm text-center leading-tight">প্রথম চ্যাট</span>
                      </div>
                      <div className="min-w-[124px] rounded-[20px] border-2 border-slate-200 bg-white p-4 flex flex-col items-center gap-3 snap-center shadow-sm">
                          <div className="w-[52px] h-[52px] rounded-full bg-rose-100 flex items-center justify-center">
                              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                          </div>
                          <span className="font-bold text-slate-700 text-sm text-center leading-tight">বিশ্বস্ত সঙ্গী</span>
                      </div>
                      <div className="min-w-[124px] rounded-[20px] border-2 border-slate-200 bg-white p-4 flex flex-col items-center gap-3 snap-center relative shadow-sm opacity-60">
                          <div className="w-[52px] h-[52px] rounded-full bg-slate-100 flex items-center justify-center">
                              <Lock className="w-6 h-6 text-slate-400" />
                          </div>
                          <span className="font-bold text-slate-500 text-sm text-center leading-tight">৩০ দিনের স্ট্রিক</span>
                          <div className="absolute inset-0 bg-white/10 rounded-[20px]"></div>
                      </div>
                  </div>
              </div>

              {/* Preferences Section */}
              <div className="mb-4 px-1">
                <h3 className="text-slate-700 font-extrabold text-lg">সেটিংস</h3>
              </div>
              <div className="bg-white rounded-[24px] border-2 border-slate-200 overflow-hidden space-y-0 flex flex-col mb-8 shadow-sm">
                  
                  <div className="p-5 border-b-2 border-slate-100 flex flex-col gap-2">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">নাম</label>
                      <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-100 border-2 border-transparent rounded-[16px] px-4 py-3 font-extrabold text-slate-700 focus:bg-white focus:border-[#1cb0f6] outline-none transition-all placeholder:text-slate-300" placeholder="আপনার নাম" />
                  </div>

                  <div className="p-5 border-b-2 border-slate-100 flex flex-col gap-2">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">Love Language</label>
                      <div className="relative">
                          <select value={loveLanguage} onChange={e => setLoveLanguage(e.target.value)} className="w-full bg-slate-100 border-2 border-transparent rounded-[16px] px-4 py-3 font-extrabold text-slate-700 focus:bg-white focus:border-[#1cb0f6] outline-none transition-all appearance-none cursor-pointer">
                              <option>Words of Affirmation</option>
                              <option>Quality Time</option>
                              <option>Receiving Gifts</option>
                              <option>Acts of Service</option>
                              <option>Physical Touch</option>
                          </select>
                          <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                  </div>

                  <div className="p-5 border-b-2 border-slate-100 flex flex-col gap-2">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">Anniversary Date</label>
                      <input type="date" value={anniversaryDate} onChange={e => setAnniversaryDate(e.target.value)} className="w-full bg-slate-100 border-2 border-transparent rounded-[16px] px-4 py-3 font-extrabold text-slate-700 focus:bg-white focus:border-[#1cb0f6] outline-none transition-all cursor-pointer" />
                  </div>
                  
                  <div className="p-5 flex flex-col gap-3">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">থিম</label>
                      <div className="flex gap-3">
                          <button onClick={() => setTheme("light")} className={cn("flex-1 py-3.5 rounded-[16px] border-2 font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95", theme === "light" ? "bg-[#1cb0f6]/10 border-[#1cb0f6] text-[#1cb0f6]" : "border-slate-200 text-slate-400 bg-white hover:bg-slate-50")}>
                              <Sun className="w-5 h-5" /> লাইট
                          </button>
                          <button onClick={() => setTheme("dark")} className={cn("flex-1 py-3.5 rounded-[16px] border-2 font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95", theme === "dark" ? "bg-[#1cb0f6]/10 border-[#1cb0f6] text-[#1cb0f6]" : "border-slate-200 text-slate-400 bg-white hover:bg-slate-50")}>
                              <Moon className="w-5 h-5" /> ডার্ক
                          </button>
                      </div>
                  </div>

              </div>
              
              <button onClick={() => setCurrentView("home")} className="w-full bg-white text-slate-400 hover:text-red-500 font-extrabold text-[15px] uppercase tracking-widest py-4 border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-[20px] transition-all flex items-center justify-center gap-2 mb-4 active:scale-95 outline-none">
                  <LogOut className="w-5 h-5" /> লগ আউট
              </button>

            </div>
          )}

          `;

  code = code.substring(0, startIndex) + newSettings + code.substring(endIndex);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced successfully");
} else {
  console.log("Error finding block bounds:", startIndex, endIndex);
}
