const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/Hi <span/g, "হ্যালো <span");
content = content.replace(/I'm Humaira, your AI companion\./g, "আমি হুমায়রা, আপনার এআই সঙ্গী।");
content = content.replace(/I'm here to listen, understand,/g, "আমি আপনার কথা শুনতে, আপনাকে বুঝতে");
content = content.replace(/and support you\./g, "আর সব সময় পাশে থাকতে এসেছি। ❤️");
content = content.replace(/>Settings</g, ">সেটিংস<");
content = content.replace(/>Profile</g, ">প্রোফাইল<");
content = content.replace(/>Your Name</g, ">আপনার নাম<");
content = content.replace(/>Appearance</g, ">অ্যাপিয়ারেন্স<");
content = content.replace(/>Dark Mode</g, ">ডার্ক মোড<");
content = content.replace(/>Back to Home</g, ">হোমে ফিরে যান<");
content = content.replace(/>Customize Prompts</g, ">প্রম্পট কাস্টমাইজ করুন<");
content = content.replace(/>Today</g, ">আজ<");

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
