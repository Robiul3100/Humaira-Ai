const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const translations = {
  '"Your AI Companion"': '"আপনার এআই সঙ্গী"',
  '"Tools & Settings"': '"টুলস এবং সেটিংস"',
  '"Mood Settings"': '"মুড সেটিংস"',
  '"Theme"': '"থিম"',
  '"Memory"': '"মেমোরি"',
  '"On"': '"চালু"',
  '"Language"': '"ভাষা"',
  '<span className="text-[13px] text-slate-400">English</span>': '<span className="text-[13px] text-slate-400">বাংলা</span>',
  '"Help & Support"': '"হেল্প এবং সাপোর্ট"',
  '"Log Out"': '"লগ আউট"',
};

for (const [eng, ben] of Object.entries(translations)) {
  content = content.replace(eng, ben);
}

// Ensure proper replace of tags
content = content.replace(/>English<\/span>/g, ">বাংলা</span>");

fs.writeFileSync('src/App.tsx', content);
console.log('Translations step 3 applied!');
