const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const translations = {
  "\"I'm Listening...\"": '"আমি শুনছি..."',
  '"Humaira is ready and listening to your voice. Just speak freely."': '"হুমায়রা প্রস্তুত এবং আপনার কথা শুনছে। নির্দ্বিধায় কথা বলুন।"',
  '"> Back to Chat"': '"> চ্যাটে ফিরে যান"',
  '"Waking up from dreams..."': '"স্বপ্ন থেকে জেগে উঠছে..."',
};

for (const [eng, ben] of Object.entries(translations)) {
  content = content.replace(eng, ben);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Translations step 4 applied!');
