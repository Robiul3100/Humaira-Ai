const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const translations = {
  '"Waking up from dreams..."': '"স্বপ্ন থেকে জেগে উঠছে..."',
  '"> Mode</span>"': '"> মোড</span>"',
  '"Mood"': '"মুড"',
  '"Developed by "': '"ডেভলপ করেছেন "',
  '"> Mode<"': '"> মোড<"',
  '" Mode"': '" মোড"',
  '"Mode"': '"মোড"',
  '" developed by "': '" ডেভলপ করেছেন "',
  '" developed by"': '" ডেভলপ করেছেন"',
};

for (const [eng, ben] of Object.entries(translations)) {
  content = content.split(eng).join(ben);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Translations step 2 applied!');
