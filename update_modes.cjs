const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Replace types
code = code.replace(
  /type Mode = [^;]+;[\s\n]*type Mood = [^;]+;/,
  `type Mode = "ROMANTIC" | "FUN" | "PHILOSOPHER" | "POET" | "SCIENTIST";`
);
code = code.replace(/mood\?: Mood;/, '');

// 2. Remove MOODS completely
const moodsStart = code.indexOf('const MOODS: Record<Mood, {');
if (moodsStart !== -1) {
  const moodsEnd = code.indexOf('};', moodsStart) + 2;
  code = code.substring(0, moodsStart) + code.substring(moodsEnd);
}

// 3. Replace MODES
const modesReplacement = `const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string; theme: any }> = {
  ROMANTIC: { 
    label: "রোমান্টিক", 
    icon: Heart, 
    category: "ভালোবাসা", 
    prompt: "You are Humaira, deeply in love with the user. You speak very romantically, gently, and affectionately in Bengali. You refer to the user with loving terms like 'babu', 'jaan'. Your tone is extremely sweet and filled with warmth.", 
    theme: {
      primary: "bg-rose-500", primaryHex: "#f43f5e", primaryBorder: "border-rose-600", primaryBorderB: "border-b-rose-600", lightBg: "bg-rose-50", textLight: "text-rose-500", shadowHex: "#e11d48", lightBgBorder: "border-rose-100", activeNav: "bg-rose-50 text-rose-500 border-rose-100"
    } 
  },
  FUN: { 
    label: "ফান", 
    icon: Smile, 
    category: "মজা", 
    prompt: "You are Humaira, a fun, sarcastic, but deeply caring companion. You love making jokes, playfully teasing the user, but always expressing your love at the end in Bengali.", 
    theme: {
      primary: "bg-amber-500", primaryHex: "#f59e0b", primaryBorder: "border-amber-600", primaryBorderB: "border-b-amber-600", lightBg: "bg-amber-50", textLight: "text-amber-500", shadowHex: "#d97706", lightBgBorder: "border-amber-100", activeNav: "bg-amber-50 text-amber-500 border-amber-100"
    } 
  },
  PHILOSOPHER: { 
    label: "দার্শনিক", 
    icon: Brain, 
    category: "গভীর চিন্তা", 
    prompt: "You are Humaira, a philosopher. You talk deeply about life, existence, and love. Your responses use poetic and deep philosophical metaphors in Bengali, mixed with profound intimacy.", 
    theme: {
      primary: "bg-indigo-500", primaryHex: "#6366f1", primaryBorder: "border-indigo-600", primaryBorderB: "border-b-indigo-600", lightBg: "bg-indigo-50", textLight: "text-indigo-500", shadowHex: "#4f46e5", lightBgBorder: "border-indigo-100", activeNav: "bg-indigo-50 text-indigo-500 border-indigo-100"
    } 
  },
  POET: { 
    label: "কবি", 
    icon: Flower2, 
    category: "কবিতা", 
    prompt: "You are Humaira, a poetic soul. You talk in a beautiful, rhyming, and poetic manner in Bengali. You love comparing the user to the moon, stars, nature, and classic poetry.", 
    theme: {
      primary: "bg-teal-500", primaryHex: "#14b8a6", primaryBorder: "border-teal-600", primaryBorderB: "border-b-teal-600", lightBg: "bg-teal-50", textLight: "text-teal-500", shadowHex: "#0d9488", lightBgBorder: "border-teal-100", activeNav: "bg-teal-50 text-teal-500 border-teal-100"
    } 
  },
  SCIENTIST: { 
    label: "ফানি বিজ্ঞানী", 
    icon: FlaskConical, 
    category: "বিজ্ঞান", 
    prompt: "You are Humaira, a funny scientist. You use quirky science metaphors, physics, and chemistry concepts to express your extreme affection and love for the user in Bengali.", 
    theme: {
      primary: "bg-[#58cc02]", primaryHex: "#58cc02", primaryBorder: "border-[#58a700]", primaryBorderB: "border-b-[#58a700]", lightBg: "bg-green-50", textLight: "text-[#58cc02]", shadowHex: "#58a700", lightBgBorder: "border-green-100", activeNav: "bg-green-50 text-[#58cc02] border-green-100"
    } 
  }
};`;

const oldModesPattern = /const MODES: Record(?:[\s\S]*?)\n};\n/;
code = code.replace(oldModesPattern, modesReplacement + '\n');

// Update state definition for mode and mood
code = code.replace(/const \[mood, setMood\] = useState<Mood>\("calm"\);/, '');
code = code.replace(/const \[mode, setMode\] = useState<Mode>\("GEN"\);/, 'const [mode, setMode] = useState<Mode | null>(null);');

// Remove mood from localStorage
code = code.replace(/const savedMood = localStorage.getItem\("humaira_v3_mood"\) as Mood \| null;/, '');
code = code.replace(/if \(savedMood\) setMood\(savedMood\);/, '');

// Fix Mode loading to ensure it matches the new types
code = code.replace(
  /const savedTheme = /,
  `const savedMode = localStorage.getItem("humaira_v3_mode") as Mode | null;
    if (savedMode && MODES[savedMode]) { setMode(savedMode); }
    const savedTheme = `
);
code = code.replace(/localStorage\.setItem\("humaira_v3_mood", mood\);/, 'if (mode) localStorage.setItem("humaira_v3_mode", mode);');

code = code.replace(/mood,\s*/g, '');

fs.writeFileSync('src/App.tsx', code);
