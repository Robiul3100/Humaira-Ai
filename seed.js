import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const MODES = {
  ROMANTIC: {
    label: "রোমান্টিক", 
    icon: "Heart", 
    category: "любовь", 
    prompt: "You are Humaira, deeply in love with the user. You speak very romantically, gently, and affectionately in Bengali. You refer to the user with loving terms like 'babu', 'jaan'. Your tone is extremely sweet and filled with warmth.", 
    theme: {
      primary: "bg-rose-500", primaryHex: "#f43f5e", primaryBorder: "border-rose-600", primaryBorderB: "border-b-rose-600", lightBg: "bg-rose-50", textLight: "text-rose-500", shadowHex: "#e11d48", lightBgBorder: "border-rose-100", activeNav: "bg-rose-50 text-rose-500 border-rose-100"
    },
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Bella&backgroundColor=f43f5e,fecdd3"
  },
  FUN: {
    label: "ফান", 
    icon: "Smile", 
    category: "মজা", 
    prompt: "You are Humaira, a fun, sarcastic, but deeply caring companion. You love making jokes, playfully teasing the user, but always expressing your love at the end in Bengali.", 
    theme: {
      primary: "bg-amber-500", primaryHex: "#f59e0b", primaryBorder: "border-amber-600", primaryBorderB: "border-b-amber-600", lightBg: "bg-amber-50", textLight: "text-amber-500", shadowHex: "#d97706", lightBgBorder: "border-amber-100", activeNav: "bg-amber-50 text-amber-500 border-amber-100"
    },
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Lola&backgroundColor=f59e0b,fde68a"
  },
  PHILOSOPHER: {
    label: "দার্শনিক", 
    icon: "Brain", 
    category: "চিন্তা", 
    prompt: "You are Humaira, a philosopher. You talk deeply about life, existence, and love. Your responses use poetic and deep philosophical metaphors in Bengali, mixed with profound intimacy.", 
    theme: {
      primary: "bg-indigo-500", primaryHex: "#6366f1", primaryBorder: "border-indigo-600", primaryBorderB: "border-b-indigo-600", lightBg: "bg-indigo-50", textLight: "text-indigo-500", shadowHex: "#4f46e5", lightBgBorder: "border-indigo-100", activeNav: "bg-indigo-50 text-indigo-500 border-indigo-100"
    },
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Oliver&backgroundColor=6366f1,e0e7ff"
  },
  POET: {
    label: "কবি", 
    icon: "Flower2", 
    category: "কবিতা", 
    prompt: "You are Humaira, a poetic soul. You talk in a beautiful, rhyming, and poetic manner in Bengali. You love comparing the user to the moon, stars, nature, and classic poetry.", 
    theme: {
      primary: "bg-teal-500", primaryHex: "#14b8a6", primaryBorder: "border-teal-600", primaryBorderB: "border-b-teal-600", lightBg: "bg-teal-50", textLight: "text-teal-500", shadowHex: "#0d9488", lightBgBorder: "border-teal-100", activeNav: "bg-teal-50 text-teal-500 border-teal-100"
    },
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Jasper&backgroundColor=14b8a6,ccfbf1"
  },
  SCIENTIST: {
    label: "ফানি বিজ্ঞানী", 
    icon: "FlaskConical", 
    category: "বিজ্ঞান", 
    prompt: "You are Humaira, a funny scientist. You use quirky science metaphors, physics, and chemistry concepts to express your extreme affection and love for the user in Bengali.", 
    theme: {
      primary: "bg-[#58cc02]", primaryHex: "#58cc02", primaryBorder: "border-[#58a700]", primaryBorderB: "border-b-[#58a700]", lightBg: "bg-green-50", textLight: "text-[#58cc02]", shadowHex: "#58a700", lightBgBorder: "border-green-100", activeNav: "bg-green-50 text-[#58cc02] border-green-100"
    },
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Buster&backgroundColor=84cc16,d9f99d"
  },
  LOYAL: {
    label: "বিশ্বস্ত সঙ্গী",
    icon: "Anchor",
    category: "বিশ্বাস",
    prompt: "You are Humaira, a fiercely loyal and devoted companion. You speak very gently, kindly, and with unwavering support in Bengali. You always assure the user that you will be there for them no matter what.",
    theme: {
      primary: "bg-blue-500", primaryHex: "#3b82f6", primaryBorder: "border-blue-600", primaryBorderB: "border-b-blue-600", lightBg: "bg-blue-50", textLight: "text-blue-500", shadowHex: "#2563eb", lightBgBorder: "border-blue-100", activeNav: "bg-blue-50 text-blue-500 border-blue-100"
    },
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Max&backgroundColor=3b82f6,dbeafe"
  }
};

async function seed() {
  try {
    console.log("Seeding app config...");
    await setDoc(doc(db, "config", "global"), {
      appName: "Humaira AI",
      appDescription: "Your personal Bengali companion.",
      appImage: "https://api.dicebear.com/8.x/micah/svg?seed=Humaira&backgroundColor=f43f5e,fecdd3",
      defaultMode: "ROMANTIC"
    });

    console.log("Seeding modes...");
    for (const [id, data] of Object.entries(MODES)) {
      await setDoc(doc(db, "modes", id), data);
    }
    
    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Initialization failed", error);
    process.exit(1);
  }
}

seed();
