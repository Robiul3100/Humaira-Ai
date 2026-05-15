const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Labels and Text
const translations = {
  '"Humaira~ALPHA"': '"হুমায়রা~আলফা"',
  '"PRO"': '"প্রো"',
  '"Humaira~LITE"': '"হুমায়রা~লাইট"',
  '"FAST"': '"ফাস্ট"',
  '"Humaira~BRAIN"': '"হুমায়রা~ব্রেইন"',
  '"SMART"': '"স্মার্ট"',
  '"General Chat"': '"সাধারণ চ্যাট"',
  '"Higher Math"': '"উচ্চতর গণিত"',
  '"Physics"': '"পদার্থবিজ্ঞান"',
  '"Chemistry"': '"রসায়ন"',
  '"Biology"': '"জীববিজ্ঞান"',
  '"Bangla"': '"বাংলা"',
  '"English"': '"ইংরেজি"',
  '"ICT"': '"আইসিটি"',
  '"General Q&A"': '"সাধারণ প্রশ্নোত্তর"',
  '"Companion Mode"': '"সঙ্গী মোড"',
  '"Calm"': '"শান্ত"',
  '"Thinking"': '"চিন্তাশীল"',
  '"Fun"': '"মজাদার"',
  '"Comfort"': '"স্বস্তিদায়ক"',
  '"Romantic"': '"রোমান্টিক"',
  '"Focused"': '"মনোযোগী"',
  '"Playful"': '"খেলোয়াড়সুলভ"',
  '"Creative"': '"সৃজনশীল"',
  '"Humaira AI"': '"হুমায়রা এআই"',
  '"Developed by "': '"ডেভলপ করেছেন "',
  "'s Companion": "'র সঙ্গী",
  '"Export PDF"': '"পিডিএফ এক্সপোর্ট"',
  '"Exporting..."': '"এক্সপোর্ট হচ্ছে..."',
  '"Cancel"': '"বাতিল"',
  '"Type your message..."': '"আপনার মেসেজ টাইপ করুন..."',
  '"How can I help you today?"': '"আমি আজ কীভাবে সাহায্য করতে পারি?"',
  '"Message Humaira AI..."': '"হুমায়রা এআই কে মেসেজ করুন..."',
  '"Say hello to Humaira!"': '"হুমায়রা কে হ্যালো বলুন!"',
  '"Humaira AI is typing"': '"হুমায়রা এআই টাইপ করছে"',
  '"I\\'m Humaira, your AI companion."': '"আমি হুমায়রা, আপনার এআই সঙ্গী।"',
  '"Humaira AI can make mistakes. Consider verifying important information."': '"হুমায়রা এআই ভুল করতে পারে। গুরুত্বপূর্ণ তথ্যের ক্ষেত্রে যাচাই করার বিষয়টি বিবেচনা করুন।"',
  '"Search chats..."': '"চ্যাট খুঁজুন..."',
  '"View more results"': '"আরো ফলাফল দেখুন"',
  '"No chats found."': '"কোনো চ্যাট পাওয়া যায়নি।"',
  '"New Chat"': '"নতুন চ্যাট"',
  '"Chats"': '"চ্যাটস"',
  '"Settings"': '"সেটিংস"',
  '"Customize Prompts"': '"প্রম্পট কাস্টমাইজ করুন"',
  '"Back to Home"': '"হোমে ফিরে যান"',
  '"ORIGIN LIVE"': '"অরিজিন লাইভ"',
  '"Humaira is ready and listening to your voice. Just speak freely."': '"হুমায়রা প্রস্তুত এবং আপনার কথা শুনছে। নির্দ্বিধায় কথা বলুন।"',
  '"End Live Session"': '"লাইভ সেশন শেষ করুন"',
  '"AI Studio"': '"এআই স্টুডিও"',
  '"Reasoning Process"': '"চিন্তার প্রক্রিয়া"',
  '"Note:"': '"বিঃদ্রঃ:"',
  '"Important"': '"গুরুত্বপূর্ণ"',
  '"Humaira is generating"': '"হুমায়রা তৈরি করছে"',
  'userName.split(" ")[0]': 'userName.split(" ")[0]',
  '>Hi <': '>হ্যালো <',
  '">👋<': '">👋<',
  'I\\'m Humaira': 'আমি হুমায়রা',
  '">AI<': '">এআই<',
  '"Clear Chat"': '"চ্যাট ক্লিয়ার করুন"',
  '"Delete"': '"মুছুন"',
  '"Today"': '"আজ"',
};

for (const [eng, ben] of Object.entries(translations)) {
  content = content.split(eng).join(ben);
}

// Special texts
content = content.replace(/'Hi <span className="text-rose-500 font-bold">'\+userName\.split\(" "\)\[0\]\+'<\/span> <span className="text-2xl animate-pulse">👋<\/span>'/g, "'হ্যালো <span className=\"text-rose-500 font-bold\">'+userName.split(\" \")[0]+'</span> <span className=\"text-2xl animate-pulse\">👋</span>'");

content = content.replace(/Hi <span/g, "হ্যালো <span");
content = content.replace(/>AI<\/span>/g, ">এআই</span>");

fs.writeFileSync('src/App.tsx', content);
console.log('Translations applied!');
