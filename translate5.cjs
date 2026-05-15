const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const translations = {
  'label: "General Chat"': 'label: "সাধারণ চ্যাট"',
  'category: "General"': 'category: "সাধারণ"',
  'label: "Higher Math"': 'label: "উচ্চতর গণিত"',
  'category: "Science"': 'category: "বিজ্ঞান"',
  'label: "Physics"': 'label: "পদার্থবিজ্ঞান"',
  'label: "Chemistry"': 'label: "রসায়ন"',
  'label: "Biology"': 'label: "জীববিজ্ঞান"',
  'label: "Bangla"': 'label: "বাংলা"',
  'category: "Humanities"': 'category: "মানবিক"',
  'label: "English"': 'label: "ইংরেজি"',
  'label: "ICT"': 'label: "আইসিটি"',
  'label: "General Q&A"': 'label: "সাধারণ প্রশ্ন"',
  'label: "Companion Mode"': 'label: "সঙ্গী মোড"',
  'category: "Premium"': 'category: "প্রিমিয়াম"',
  'label: "Calm"': 'label: "শান্ত"',
  'label: "Thinking"': 'label: "চিন্তাশীল"',
  'label: "Fun"': 'label: "মজাদার"',
  'label: "Comfort"': 'label: "স্বস্তিদায়ক"',
  'label: "Romantic"': 'label: "রোমান্টিক"',
  'label: "Focused"': 'label: "মনোযোগী"',
  'label: "Playful"': 'label: "খেলোয়াড়সুলভ"',
  'label: "Creative"': 'label: "সৃজনশীল"'
};

for (const [eng, ben] of Object.entries(translations)) {
  content = content.replace(eng, ben);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Translations step 5 applied!');
