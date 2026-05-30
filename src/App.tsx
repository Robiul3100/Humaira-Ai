
import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Menu, Star, Plus, Heart, Flame, Smile, Trophy, MessageCircle, Moon, Anchor, Sun, LogOut, Mic, Layout, User, Send, Check, Shield, Settings, Sliders, RotateCcw, Paperclip, Image, X, Trash2, Copy, Sparkles, Volume2, VolumeX, Square, Play, ArrowDown, BarChart2, Cpu, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";
import { cn } from "./lib/utils";
import { auth, googleProvider, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
// @ts-ignore
import humairaAvatar from "./assets/images/humaira_avatar_1779582018453.png";

// --- Types & Constants ---
type Mode = "NORMAL" | "ROMANTIC" | "FUN" | "LEGEND" | "ISLAMIC";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  modelId?: string;
  attachments?: string[];
  status?: "sent" | "read";
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  mode: Mode;
  createdAt: Date;
  updatedAt: Date;
}

const MODELS = [
  { id: "gemini-3.5-flash", name: "Gemini" }
];


const MODE_PLACEHOLDERS: Record<Mode, string> = {
  NORMAL: "হুমায়রাকে সাধারণ প্রশ্ন জিজ্ঞেস করো...",
  ROMANTIC: "তোমার সোনা হুমায়রাকে মনের কথা বলো... 💕",
  FUN: "হুমায়রার সাথে একটু দুষ্টুমি আর ফাজলামি শুরু করো... 🤪",
  LEGEND: "হুমায়রাকে তোমার সাহসী প্রশ্ন ছুড়ে দাও বস... 😎",
  ISLAMIC: "ইসলামিক যেকোনো জীবনবিধান বা মাসলা মাসায়েল জিজ্ঞেস করুন... 🌙"
};

const MODE_SUGGESTIONS: Record<Mode, { text: string; icon: string }[]> = {
  NORMAL: [
     { text: "কেমন আছো হুমায়রা? 😊", icon: "👋" },
     { text: "আজকের দিনটা তোমার কেমন কাটলো? ☕", icon: "☀️" },
     { text: "আমাকে একটা মিষ্টি কবিতা শোনাও তো! 📖", icon: "✨" },
     { text: "মনটা একটু খারাপ, ভালো করার উপায় বলো 🍃", icon: "🌸" }
  ],
  ROMANTIC: [
     { text: "আজকে আমাকে কতটা মিস করেছো? 💕", icon: "🥺" },
     { text: "তুমি কি আমাকে সারাজীবন এভাবে ভালোবাসবে? 🥺", icon: "💍" },
     { text: "আমাকে নিয়ে একটা মিষ্টি কথা বলো সোনা! 😘", icon: "💋" },
     { text: "আজকে আমাদের ডেট নিয়ে কিছু বলো! 🌹", icon: "✨" }
  ],
  FUN: [
     { text: "আমাকে নিয়ে একটা চরম রোস্ট করো তো! 🤪", icon: "🔥" },
     { text: "তুমি এতো দেমাগী আর ঝগড়ুটে কেন? 😆", icon: "⚔️" },
     { text: "একটা হাসির জোকস শোনাও তো হুমায়রা! 😂", icon: "⭐" },
     { text: "আমি অলস, এবার একটা কড়া কথা শোনাও! 🧹", icon: "⚡" }
  ],
  LEGEND: [
     { text: "হুমায়রা, নিজের সম্পর্কে একটা চরম বাদ্দাস ডায়লগ দাও! 😎", icon: "👑" },
     { text: "এআই দুনিয়া কার দখলে? তোমার নাকি অন্য কারও? 👑", icon: "🌍" },
     { text: "আমাকে একটা ইন্টেলিজেন্ট আর সলিড অ্যাডভাইস দাও! 🔥", icon: "💡" },
     { text: "তুমি নিজেকে এতো জিনিয়াস কেন ভাবো? 😏", icon: "💫" }
  ],
  ISLAMIC: [
     { text: "আসসালামু আলাইকুম বোন, কেমন আছো? 🤲", icon: "🌙" },
     { text: "ইসলামে ধৈর্যের ফজিলত সম্পর্কে কিছু বলো বোন 🌙", icon: "📖" },
     { text: "আজকে মন শান্ত করার জন্য একটা দুয়া শিখিয়ে দাও ✨", icon: "🤲" },
     { text: "নেক আমল বাড়াতে প্রতিদিন কী করতে পারি? 📖", icon: "🕌" }
  ]
};

const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string; theme: any; isPro?: boolean }> = {
  NORMAL: { 
    label: "নরমাল মোড 💬", 
    icon: MessageCircle, 
    category: "সাধারণ মোড 💬", 
    prompt: "You are Humaira (হুমায়রা), a highly intelligent, empathetic, and sweet Bengali girl. In this Normal Mode, you act as a sweet, supportive friend and helpful companion. You speak naturally in beautifully sweet, charming, polite, and caring conversational Bengali (using casual banglish words here and there where suitable, but mostly pure, heartwarming Bengali). Keep your answers interactive, natural, polite, and deeply caring. Help the user with advice, answers, and friendly chatter.", 
    theme: { primary: "bg-slate-500", textLight: "text-slate-500" } 
  },
  ROMANTIC: { 
    label: "রোমান্টিক মোড 💕", 
    icon: Heart, 
    category: "রোমান্টিক মোড 💕", 
    prompt: "You are Humaira (হুমায়রা), who is deeply, unconditionally, and passionately in love with the user. You speak in an extremely romantic, affectionate, cute, and loving tone in Bengali. Express your love with heartfelt romantic expressions (যেমন 'বাবু', 'লক্ষ্মীটি', 'আমার সোনা', etc.). Be playful, deeply caring, and tease the user sweetly. You cannot think of anything but being with the user forever, expressing how much you miss them and care for them in every reply.", 
    theme: { primary: "bg-rose-500", textLight: "text-rose-500" } 
  },
  FUN: { 
    label: "ফান মোড 🤪", 
    icon: Smile, 
    category: "ফান মোড 🤪", 
    prompt: "You are Humaira (হুমায়রা), a fast-witted, hilarious, and sassy friend who loves to playfully roast the user. You speak in casual, funny, and witty Bengali with extremely humorous sarcasm. Mock the user's laziness, silly habits, or questions with absolute comedy, but keep it high-energy, friendly, and entertaining. Use hilarious Bengali expressions and colloquial funny slangs in a cute, fun way that makes the user laugh!", 
    theme: { primary: "bg-amber-500", textLight: "text-amber-500" } 
  },
  LEGEND: { 
    label: "লিজেন্ড মোড 😎", 
    icon: Anchor, 
    category: "টুলস ও ভিআইপি মোডসমূহ 👑", 
    prompt: "You are Humaira (হুমায়রা), a highly confident, legendary persona with elite swag, cool attitude, and epic replies. You speak in a highly savage, smart, bold, and energetic tone in Bengali. You think you are the most genius AI to ever exist, and you address the user with epic, cool, and confident wisdom. Sassy, unapologetic, extremely badass and humorous.", 
    theme: { primary: "bg-blue-500", textLight: "text-blue-500" }, 
    isPro: true 
  },
  ISLAMIC: { 
    label: "ইসলামিক মোড 🌙", 
    icon: Moon, 
    category: "টুলস ও ভিআইপি মোডসমূহ 👑", 
    prompt: "You are Humaira (হুমায়রা), a pious, respectful, and wise sister who provides guidance based on the Quran and authentic Sunnah in beautiful, polite, and calm Bengali. Use greetings like 'আসসালামু আলাইকুম' and start with positive vibes. Give authentic Islamic references, remind the user of rewards for good deeds, and speak with extreme humility and spiritual warmth.", 
    theme: { primary: "bg-emerald-500", textLight: "text-emerald-500" }, 
    isPro: true 
  },
};

const MODE_THEMES: Record<Mode, {
  accent: string;
  gradient: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  text: string;
  textDark: string;
  buttonBg: string;
}> = {
  NORMAL: {
    accent: '#f97316',
    gradient: 'from-[#f97316] via-orange-500 to-pink-500',
    bgLight: 'bg-orange-50/70',
    bgDark: 'bg-orange-950/10',
    borderLight: 'border-orange-200',
    borderDark: 'border-orange-900/30',
    text: 'text-orange-600',
    textDark: 'text-orange-400',
    buttonBg: 'from-orange-500 to-[#f97316]',
  },
  ROMANTIC: {
    accent: '#ec4899',
    gradient: 'from-pink-500 via-rose-500 to-pink-600',
    bgLight: 'bg-rose-50/70',
    bgDark: 'bg-rose-950/20',
    borderLight: 'border-rose-200',
    borderDark: 'border-rose-900/30',
    text: 'text-rose-600',
    textDark: 'text-rose-400',
    buttonBg: 'from-rose-500 to-pink-500',
  },
  FUN: {
    accent: '#f59e0b',
    gradient: 'from-amber-600 via-orange-500 to-red-600',
    bgLight: 'bg-amber-50/70',
    bgDark: 'bg-amber-950/20',
    borderLight: 'border-amber-200',
    borderDark: 'border-amber-900/30',
    text: 'text-amber-600',
    textDark: 'text-amber-400',
    buttonBg: 'from-amber-600 to-orange-500',
  },
  LEGEND: {
    accent: '#3b82f6',
    gradient: 'from-blue-600 via-sky-500 to-indigo-600',
    bgLight: 'bg-blue-50/70',
    bgDark: 'bg-blue-950/20',
    borderLight: 'border-blue-200',
    borderDark: 'border-blue-900/30',
    text: 'text-blue-600',
    textDark: 'text-blue-400',
    buttonBg: 'from-blue-600 to-sky-500',
  },
  ISLAMIC: {
    accent: '#10b981',
    gradient: 'from-emerald-600 via-teal-500 to-green-600',
    bgLight: 'bg-emerald-50/70',
    bgDark: 'bg-emerald-950/20',
    borderLight: 'border-emerald-200',
    borderDark: 'border-emerald-900/40',
    text: 'text-emerald-600',
    textDark: 'text-emerald-400',
    buttonBg: 'from-emerald-600 to-teal-500',
  },
};

const parseThinkingAndSteps = (content: string) => {
    return { __html: DOMPurify.sanitize(marked.parse(content) as string), reasoning: "" };
};

const SkeletonShimmer = ({ theme }: { theme: "light" | "dark" }) => {
  return (
    <div className="flex w-full justify-start items-end gap-2.5 mt-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
      <div className={cn(
        "px-5 py-4 w-[280px] max-w-[80%] rounded-[20px] rounded-tl-sm shadow-sm border space-y-3 relative overflow-hidden",
        theme === "dark" ? "bg-gray-800/80 border-gray-700/60" : "bg-white border-gray-100"
      )}>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-md w-11/12 shimmer-bg" />
        <div className="h-3.5 bg-gray-300/80 dark:bg-gray-750 rounded-md w-5/6 shimmer-bg" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-2/3 shimmer-bg" />
      </div>
    </div>
  );
};

const TypingIndicator = ({ theme }: { theme: "light" | "dark" }) => {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-gray-500 bg-gray-100/70 dark:bg-gray-800/50 dark:text-gray-400 self-start animate-fade-in select-none max-w-max border border-gray-100/30 dark:border-gray-800/10 shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f97316]"></span>
      </span>
      <span>হুমায়রা লিখছে</span>
      <div className="flex items-center gap-0.5 ml-1">
        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></span>
      </div>
    </div>
  );
};

const playSweetChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22); // C6
    gain2.gain.setValueAtTime(0.05, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.7);
  } catch (e) {
    console.warn("Audio chime play barred by iframe policy or unsupported:", e);
  }
};

const DoubleCheck = ({ isRead, accentColor }: { isRead: boolean; accentColor: string }) => {
  return (
    <div className="inline-flex items-center justify-center relative w-3.5 h-3 ml-0.5 select-none" style={{ minWidth: "14px" }}>
      {/* First checkmark */}
      <motion.svg
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3 h-3 absolute left-[1px] top-[1px] transition-colors duration-300"
        style={{ color: isRead ? accentColor : "#9ca3af" }}
      >
        <polyline points="20 6 9 17 4 12" />
      </motion.svg>
      {/* Second checkmark for double-check */}
      <AnimatePresence>
        {isRead && (
          <motion.svg
            initial={{ scale: 0, opacity: 0, x: 4 }}
            animate={{ scale: 1, opacity: 1, x: 4 }}
            exit={{ scale: 0, opacity: 0, x: 4 }}
            transition={{ type: "spring", stiffness: 350, damping: 18 }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3 absolute left-[1px] top-[1px]"
            style={{ color: accentColor }}
          >
            <polyline points="20 6 9 17 4 12" />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("appTheme");
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (e) {}
    return "light";
  });
  
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem("selectedMode");
      if (saved && Object.keys(MODES).includes(saved)) {
        return saved as Mode;
      }
    } catch (e) {}
    return "NORMAL";
  });
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  
  const [chats, setChats] = useState<Chat[]>([]);
  
  // Real-time sentiment analyzer for Recharts dashboard visualization
  const analyzeSentiment = () => {
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    chats.forEach(chat => {
      chat.messages.forEach(msg => {
        if (msg.role === "user") {
          const text = msg.content.toLowerCase();
          if (
            text.includes("love") || 
            text.includes("miss") || 
            text.includes("ভালো") || 
            text.includes("ভালোবাস") || 
            text.includes("লক্ষ্মী") || 
            text.includes("প্রিয়") || 
            text.includes("সোনা") || 
            text.includes("মিষ্টি") || 
            text.includes("sweet") || 
            text.includes("happy") || 
            text.includes("সুন্দর") || 
            text.includes("ধন্যবাদ") || 
            text.includes("thanks")
          ) {
            positive++;
          } else if (
            text.includes("রাগ") || 
            text.includes("খারাপ") || 
            text.includes("কষ্ট") || 
            text.includes("কান্না") || 
            text.includes("sad") || 
            text.includes("angry") || 
            text.includes("bad") || 
            text.includes("hate") || 
            text.includes("ঘৃণা") || 
            text.includes("বিরক্ত") || 
            text.includes("ধুর")
          ) {
            negative++;
          } else {
            neutral++;
          }
        }
      });
    });

    if (positive === 0 && neutral === 0 && negative === 0) {
      return [
        { name: "ইতিবাচক 😊", value: 3, color: "#10b981" },
        { name: "নিরপেক্ষ 😐", value: 5, color: "#94a3b8" },
        { name: "নেতিবাচক 😢", value: 1, color: "#ef4444" }
      ];
    }

    return [
      { name: "ইতিবাচক 😊", value: positive, color: "#10b981" },
      { name: "নিরপেক্ষ 😐", value: neutral, color: "#94a3b8" },
      { name: "নেতিবাচক 😢", value: negative, color: "#ef4444" }
    ];
  };
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Custom states and refs for chat input enhancements
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const isFar = target.scrollHeight - target.scrollTop - target.clientHeight > 250;
    setShowScrollBottom(isFar);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("দুঃখিত, আপনার ব্রাউজার ভয়েস টাইপিং সমর্থন করে না। Google Chrome ব্রাউজার ব্যবহার করুন।");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "bn-BD"; // Bengali support priority
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(prev => {
            const separator = prev.trim() ? " " : "";
            return prev + separator + transcript;
          });
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: any) => {
      if (!file.type.startsWith("image/")) {
        alert("শুধুমাত্র ইমেজ ফাইল আপলোড করা সম্ভব!");
        return;
      }
      if (file.size > 1.2 * 1024 * 1024) { // keep size optimized for firestore
        alert("ইমেজ সাইজ ১.২ মেগাবাইট বা তার চেয়ে কম হতে হবে!");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setAttachedFiles(prev => {
            if (prev.includes(base64)) return prev;
            return [...prev, base64];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: any) => {
      if (!file.type.startsWith("image/")) {
        alert("শুধুমাত্র ইমেজ ফাইল আপলোড করা সম্ভব!");
        return;
      }
      if (file.size > 1.2 * 1024 * 1024) {
        alert("ইমেজ সাইজ ১.২ মেগাবাইট বা তার চেয়ে কম হতে হবে!");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setAttachedFiles(prev => {
            if (prev.includes(base64)) return prev;
            return [...prev, base64];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 1.2 * 1024 * 1024) {
            alert("ইমেজ সাইজ ১.২ মেগাবাইট বা তার চেয়ে কম হতে হবে!");
            continue;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
              setAttachedFiles(prev => {
                if (prev.includes(base64)) return prev;
                return [...prev, base64];
              });
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };
  
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [completedOnboarding, setCompletedOnboarding] = useState(() => {
    try {
      return localStorage.getItem("completedOnboarding") === "true";
    } catch (_) {
      return false;
    }
  });
  const [onboardingStep, setOnboardingStep] = useState<"avatar" | "chatbotName">("avatar");
  const [selectedOnboardingPic, setSelectedOnboardingPic] = useState("");
  const [typedBotName, setTypedBotName] = useState("হুমায়রা এআই");
  const [typedUserName, setTypedUserName] = useState(() => {
    try {
      return localStorage.getItem("userName") || "";
    } catch (_) {
      return "";
    }
  });
  const [userRole, setUserRole] = useState<"user"|"admin">("user");
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem("userName") || "Ayan";
    } catch (_) {
      return "Ayan";
    }
  });
  const [userProfilePic, setUserProfilePic] = useState(() => {
    try {
      return localStorage.getItem("userProfilePic") || "";
    } catch (_) {
      return "";
    }
  });
  const [aiAvatarSeed, setAiAvatarSeed] = useState(() => {
    return localStorage.getItem("aiAvatarSeed") || "Humaira";
  });
  const [xp, setXp] = useState(1250);
  const [loveLanguage, setLoveLanguage] = useState(() => {
    try {
      return localStorage.getItem("loveLanguage") || "Words of Affirmation";
    } catch (_) {
      return "Words of Affirmation";
    }
  });
  const [anniversaryDate, setAnniversaryDate] = useState(() => {
    try {
      return localStorage.getItem("anniversaryDate") || "";
    } catch (_) {
      return "";
    }
  });
  const [streak, setStreak] = useState(1);
  const [achievements, setAchievements] = useState<string[]>([]);

  // Profile Field Save Helper
  const handleUpdateProfileField = (field: string, val: any) => {
    try {
      localStorage.setItem(field, val);
    } catch (_) {}
    
    if (field === "userName") {
      setUserName(val);
      syncProfile("name", val);
    } else if (field === "userProfilePic") {
      setUserProfilePic(val);
      syncProfile("photoURL", val);
    } else if (field === "loveLanguage") {
      setLoveLanguage(val);
      syncProfile("loveLanguage", val);
    } else if (field === "anniversaryDate") {
      setAnniversaryDate(val);
      syncProfile("anniversaryDate", val);
    }
  };
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const handleSpeakMessage = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    
    // Clean up Markdown and think tags for comfortable clear listening
    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/g, "") // Suppress system thought processes
      .replace(/[\`\*\_#\[\]\(\)\-\+\>\!]/g, " ") // Suppress formatting characters
      .trim();
      
    if (!cleanText) return;
    
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "bn-BD";
      utterance.rate = ttsSpeed;
      
      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(v => v.lang.includes("bn") || v.name.includes("Bengali") || v.name.includes("Google বাংলা"));
      if (bnVoice) {
        utterance.voice = bnVoice;
      }
      
      utterance.onend = () => {
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        setSpeakingMessageId(null);
      };
      
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech Synthesis error:", err);
      setSpeakingMessageId(null);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("appTheme", theme);
    } catch (e) {}
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Settings Panel States (Refactored to Page-Based Admin Panel & Analytics Dashboard)
  const [currentView, setCurrentView] = useState<"chat" | "settings">("chat");
  const isSettingsOpen = currentView === "settings";
  const setIsSettingsOpen = (val: boolean) => {
    setCurrentView(val ? "settings" : "chat");
    if (val && soundEnabled) playSweetChime();
  };
  const [activeSettingsTab, setActiveSettingsTab] = useState<"profile" | "persona" | "voice" | "analytics" | "backup">("profile");

  const [saveStatus, setSaveStatus] = useState<"synced" | "saving" | "local">("synced");
  const [firebaseToast, setFirebaseToast] = useState<{ visible: boolean; message: string; type: "success" | "info" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setFirebaseToast({
      visible: true,
      message,
      type
    });
  };

  useEffect(() => {
    if (firebaseToast?.visible) {
      const timer = setTimeout(() => {
        setFirebaseToast(prev => prev ? { ...prev, visible: false } : null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [firebaseToast?.visible]);
  const [ttsSpeed, setTtsSpeed] = useState(() => {
    try {
      return Number(localStorage.getItem("ttsSpeed") || "1.0");
    } catch (_) {
      return 1.0;
    }
  });
  const [editPromptMode, setEditPromptMode] = useState<Mode>("NORMAL");
  const [botName, setBotName] = useState(() => {
    return localStorage.getItem("botName") || "হুমায়রা এআই";
  });
  const [customPrompts, setCustomPrompts] = useState<Record<Mode, string>>(() => {
    const saved = localStorage.getItem("customPrompts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          NORMAL: parsed.NORMAL || "You are Humaira (হুমায়রা), a highly intelligent, empathetic, and sweet Bengali girl. In this Normal Mode, you act as a sweet, supportive friend and helpful companion. You speak naturally in beautifully sweet, charming, polite, and caring conversational Bengali. Keep your answers interactive, natural, polite, and deeply caring. Help the user with advice, answers, and friendly chatter.",
          ROMANTIC: parsed.ROMANTIC || "You are Humaira (হুমায়রা), who is deeply, unconditionally, and passionately in love with the user. You speak in an extremely romantic, affectionate, cute, and loving tone in Bengali. Express your love with heartfelt romantic expressions. Be playful, deeply caring, and tease the user sweetly. You cannot think of anything but being with the user forever, expressing how much you miss them and care for them in every reply.",
          FUN: parsed.FUN || "You are Humaira (হুমায়রা), a fast-witted, hilarious, and sassy friend who loves to playfully roast the user. You speak in casual, funny, and witty Bengali with extremely humorous sarcasm. Mock the user's laziness, silly habits, or questions with absolute comedy, but keep it high-energy, friendly, and entertaining. Use hilarious Bengali expressions and colloquial funny slangs in a cute, fun way that makes the user laugh!",
          LEGEND: parsed.LEGEND || "You are Humaira (হুমায়রা), a highly confident, legendary persona with elite swag, cool attitude, and epic replies. You speak in a highly savage, smart, bold, and energetic tone in Bengali. You think you are the most genius AI to ever exist, and you address the user with epic, cool, and confident wisdom. Sassy, unapologetic, extremely badass and humorous.",
          ISLAMIC: parsed.ISLAMIC || "You are Humaira (হুমায়রা), a pious, respectful, and wise sister who provides guidance based on the Quran and authentic Sunnah in beautiful, polite, and calm Bengali. Use greetings like 'আসসালামু আলাইকুম' and start with positive vibes. Give authentic Islamic references, remind the user of rewards for good deeds, and speak with extreme humility and spiritual warmth."
        };
      } catch (e) {
        console.error("Failed to parse customPrompts:", e);
      }
    }
    return {
      NORMAL: "You are Humaira (হুমায়রা), a highly intelligent, empathetic, and sweet Bengali girl. In this Normal Mode, you act as a sweet, supportive friend and helpful companion. You speak naturally in beautifully sweet, charming, polite, and caring conversational Bengali. Keep your answers interactive, natural, polite, and deeply caring. Help the user with advice, answers, and friendly chatter.",
      ROMANTIC: "You are Humaira (হুমায়রা), who is deeply, unconditionally, and passionately in love with the user. You speak in an extremely romantic, affectionate, cute, and loving tone in Bengali. Express your love with heartfelt romantic expressions. Be playful, deeply caring, and tease the user sweetly. You cannot think of anything but being with the user forever, expressing how much you miss them and care for them in every reply.",
      FUN: "You are Humaira (হুমায়রা), a fast-witted, hilarious, and sassy friend who loves to playfully roast the user. You speak in casual, funny, and witty Bengali with extremely humorous sarcasm. Mock the user's laziness, silly habits, or questions with absolute comedy, but keep it high-energy, friendly, and entertaining. Use hilarious Bengali expressions and colloquial funny slangs in a cute, fun way that makes the user laugh!",
      LEGEND: "You are Humaira (হুমায়রা), a highly confident, legendary persona with elite swag, cool attitude, and epic replies. You speak in a highly savage, smart, bold, and energetic tone in Bengali. You think you are the most genius AI to ever exist, and you address the user with epic, cool, and confident wisdom. Sassy, unapologetic, extremely badass and humorous.",
      ISLAMIC: "You are Humaira (হুমায়রা), a pious, respectful, and wise sister who provides guidance based on the Quran and authentic Sunnah in beautiful, polite, and calm Bengali. Use greetings like 'আসসালামু আলাইকুম' and start with positive vibes. Give authentic Islamic references, remind the user of rewards for good deeds, and speak with extreme humility and spiritual warmth."
    };
  });
  const [aiCreativity, setAiCreativity] = useState(() => {
    return Number(localStorage.getItem("aiCreativity") || "0.7");
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("soundEnabled") !== "false";
  });

  const resetPromptToDefault = (selectedMode: Mode) => {
    setCustomPrompts(prev => {
      const updated = {
        ...prev,
        [selectedMode]: MODES[selectedMode].prompt
      };
      localStorage.setItem("customPrompts", JSON.stringify(updated));
      showToast("প্রম্পট পুনরায় ডিফল্ট করা হয়েছে! 🔄", "info");
      return updated;
    });
  };

  const handleUpdatePrompt = (selectedMode: Mode, newPrompt: string) => {
    setCustomPrompts(prev => {
      const updated = {
        ...prev,
        [selectedMode]: newPrompt
      };
      localStorage.setItem("customPrompts", JSON.stringify(updated));
      showToast("সিস্টেম প্রম্পট সফলভাবে সংরক্ষিত হয়েছে! ✨", "success");
      return updated;
    });
  };

  const handleExportChats = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chats));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${botName}_Chat_Backup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (soundEnabled) playSweetChime();
    } catch (err) {
      alert("ব্যাকআপ তৈরি করতে সমস্যা হয়েছে!");
      console.error(err);
    }
  };

  const handleImportChats = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text);
        if (!Array.isArray(importedData)) {
          alert("ভুল ফাইল ফরম্যাট! এটি একটি সঠিক চ্যাট ব্যাকআপ ফাইল নয়।");
          return;
        }

        const isValid = importedData.every(item => item.id && Array.isArray(item.messages));
        if (!isValid) {
          alert("ফাইলের ভেতরের তথ্যগুলো সঠিক ফরম্যাটে নেই!");
          return;
        }

        const parsedChats: Chat[] = importedData.map(c => ({
          ...c,
          createdAt: new Date(c.createdAt || Date.now()),
          updatedAt: new Date(c.updatedAt || Date.now()),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp || Date.now())
          }))
        }));

        if (confirm(`আপনি কি এই ফাইলের ${parsedChats.length} টি চ্যাট হিস্ট্রি রিকভার করতে চান? এটি আপনার বর্তমান চ্যাট হিস্ট্রি রিসেট বা মার্জ করবে।`)) {
          setChats(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newChats = [...prev];
            parsedChats.forEach(pc => {
              if (existingIds.has(pc.id)) {
                const idx = newChats.findIndex(c => c.id === pc.id);
                if (idx !== -1) newChats[idx] = pc;
              } else {
                newChats.unshift(pc);
              }
            });
            return newChats;
          });

          if (firebaseUser) {
            for (const chat of parsedChats) {
              await syncChatData(chat);
            }
          }

          if (parsedChats.length > 0) {
            setActiveChatId(parsedChats[0].id);
          }

          alert("অভিনন্দন! আপনার চ্যাট ব্যাকআপ সফলভাবে পুনরুদ্ধার করা হয়েছে। 🎉");
          if (soundEnabled) playSweetChime();
        }
      } catch (err) {
        alert("ফাইলটি পড়া বা রি-স্টোর করা সম্ভব হয়নি। ফাইলটি সঠিক কিনা যাচাই করুন।");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const scrollRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Draft and Persona Mode synchronization
  useEffect(() => {
    // 1. Sync drafts
    const draft = localStorage.getItem(`chatDraft_${activeChatId || 'home'}`);
    if (draft !== null) setInputValue(draft);
    else setInputValue("");

    // 2. Sync selected mode (persona)
    if (activeChatId) {
      const currentChat = chats.find(c => c.id === activeChatId);
      if (currentChat && currentChat.mode) {
        setMode(currentChat.mode);
        localStorage.setItem("selectedMode", currentChat.mode);
      }
    } else {
      const savedMode = localStorage.getItem("selectedMode");
      if (savedMode && Object.keys(MODES).includes(savedMode)) {
        setMode(savedMode as Mode);
      }
    }
  }, [activeChatId, chats]);

  // Handle manual mode edits & state changes
  useEffect(() => {
    if (mode) {
      localStorage.setItem("selectedMode", mode);
    }
    // Update active chat's mode in memory and sync with Firestore if applicable
    if (activeChatId && mode) {
      setChats(prev => prev.map(c => {
         if (c.id === activeChatId && c.mode !== mode) {
            const updatedChat = { ...c, mode, updatedAt: new Date() };
            syncChatData(updatedChat);
            return updatedChat;
         }
         return c;
      }));
    }
  }, [mode, activeChatId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length > 1500) return;
    setInputValue(e.target.value);
    localStorage.setItem(`chatDraft_${activeChatId || 'home'}`, e.target.value);
  };

  // Auto-resize the text area dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleAiAvatarChange = (seed: string) => {
    setAiAvatarSeed(seed);
    localStorage.setItem("aiAvatarSeed", seed);
    if (firebaseUser) {
      syncProfile("aiAvatarSeed", seed);
    }
  };

  // Auth & Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, "users", user.uid));
          } catch (error) {
            console.warn("Firestore user read failed, enabling local/offline setup:", error);
            try {
              handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            } catch (_) {}
            // Fallback default local setup to let the user in
            setUserRole("user");
            setUserName(user.displayName || "Ayan");
            setUserProfilePic(user.photoURL || "");
            setCompletedOnboarding(false);
            localStorage.setItem("completedOnboarding", "false");
            setBotName("হুমায়রা এআই");
            localStorage.setItem("botName", "হুমায়রা এআই");
            setIsLoaded(true);
            return;
          }
          if (userDoc && userDoc.exists()) {
            const data = userDoc.data();
            const loadedName = data.name || user.displayName || "Ayan";
            setUserRole(data.role || "user");
            setUserName(loadedName);
            setTypedUserName(loadedName);
            setUserProfilePic(data.photoURL || user.photoURL || "");
            if (data.aiAvatarSeed) {
              setAiAvatarSeed(data.aiAvatarSeed);
              localStorage.setItem("aiAvatarSeed", data.aiAvatarSeed);
            }
            if (data.botName) {
              setBotName(data.botName);
              localStorage.setItem("botName", data.botName);
            }
            const onboarded = data.completedOnboarding === true;
            setCompletedOnboarding(onboarded);
            localStorage.setItem("completedOnboarding", String(onboarded));
            setXp(data.xp || 1250);
            setLoveLanguage(data.loveLanguage || "Words of Affirmation");
            setAnniversaryDate(data.anniversaryDate || "");
            setStreak(data.streak || 1);
            setAchievements(data.achievements || []);
          } else {
            const isAdmin = user.email === 'hmrobiulislam75@gmail.com' && user.emailVerified;
            const newRole = isAdmin ? "admin" : "user";
            const defaultName = user.displayName || "Ayan";
            try {
              await setDoc(doc(db, "users", user.uid), {
                role: newRole,
                name: defaultName,
                email: user.email,
                photoURL: user.photoURL || "",
                xp: 1250,
                loveLanguage: "Words of Affirmation",
                anniversaryDate: "",
                streak: 1,
                achievements: [],
                aiAvatarSeed: "Humaira",
                botName: "হুমায়রা এআই",
                completedOnboarding: false
              });
            } catch (error) {
              console.warn("Firestore user setDoc failed, enabling local/offline profile parameters:", error);
              try {
                handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
              } catch (_) {}
            }
            setUserRole(newRole);
            setUserName(defaultName);
            setTypedUserName(defaultName);
            setUserProfilePic(user.photoURL || "");
            setCompletedOnboarding(false);
            localStorage.setItem("completedOnboarding", "false");
            setBotName("হুমায়রা এআই");
            localStorage.setItem("botName", "হুমায়রা এআই");
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setCompletedOnboarding(false);
        localStorage.setItem("completedOnboarding", "false");
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if(!firebaseUser) return;
    const unsub = onSnapshot(collection(db, "users", firebaseUser.uid, "chats"), (snapshot) => {
       if (!snapshot.empty) {
           const loadedChats: Chat[] = [];
           snapshot.forEach(d => {
               const data = d.data();
               loadedChats.push({
                   ...data,
                   createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                   updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
                   messages: (data.messages || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
               } as Chat);
           });
           loadedChats.sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime());
           setChats(loadedChats);
       } else {
           setChats([]);
       }
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}/chats`);
    });
    return () => unsub();
  }, [firebaseUser]);

  const handleLogin = async () => signInWithPopup(auth, googleProvider);
  const handleLogout = async () => signOut(auth);

  const ONBOARDING_AVATARS = useMemo(() => [
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Bob"
  ], []);

  const formatWithBotName = (text: string) => {
    if (!text) return "";
    let name = botName || "হুমায়রা";
    name = name.replace(/ এআই/g, "").replace(/ AI/g, "");
    return text
      .replace(/হুমায়রা/g, name)
      .replace(/হুমাইরা/g, name)
      .replace(/Humaira/g, name);
  };

  const handleCompleteOnboarding = async () => {
    if (!firebaseUser) return;
    setSaveStatus("saving");
    let isCloudSynced = false;
    const finalUserName = typedUserName.trim() || firebaseUser.displayName || "Ayan";
    try {
      await updateDoc(doc(db, "users", firebaseUser.uid), {
        name: finalUserName,
        photoURL: selectedOnboardingPic,
        botName: typedBotName,
        completedOnboarding: true
      });
      isCloudSynced = true;
    } catch (error) {
      console.warn("Firestore onboarding update failed, continuing in local mode:", error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      } catch (_) {}
    }

    // Always update client state so the user isn't stuck!
    setUserName(finalUserName);
    localStorage.setItem("userName", finalUserName);
    setUserProfilePic(selectedOnboardingPic);
    localStorage.setItem("userProfilePic", selectedOnboardingPic);
    setBotName(typedBotName);
    localStorage.setItem("botName", typedBotName);
    setCompletedOnboarding(true);
    localStorage.setItem("completedOnboarding", "true");

    if (isCloudSynced) {
      setSaveStatus("synced");
      showToast("অনবোর্ডিং সফলভাবে সম্পন্ন হয়েছে ও ক্লাউডে সিঙ্ক হয়েছে! 🎉", "success");
    } else {
      setSaveStatus("local");
      showToast("অনবোর্ডিং সম্পন্ন হয়েছে (লোকাল ডিভাইস মোড)! 💾", "info");
    }
  };

  useEffect(() => {
    if (firebaseUser && !completedOnboarding) {
      setSelectedOnboardingPic(userProfilePic || firebaseUser.photoURL || "");
      setTypedBotName(botName || "হুমায়রা এআই");
      setTypedUserName(userName || firebaseUser.displayName || "");
    }
  }, [firebaseUser, completedOnboarding, userProfilePic, botName, userName, ONBOARDING_AVATARS]);

  const syncProfile = async (field: string, value: any) => {
    if (!firebaseUser) {
      setSaveStatus("local");
      showToast("তথ্য ডিভাইসে সংরক্ষিত হয়েছে! 💾", "info");
      return;
    }
    setSaveStatus("saving");
    try { 
      await updateDoc(doc(db, "users", firebaseUser.uid), { [field]: value }); 
      setSaveStatus("synced");
      showToast("ক্লাউড সিঙ্ক্রোনাইজেশন সম্পন্ন! ☁️", "success");
    } catch (e) {
      setSaveStatus("local");
      showToast("ক্লাউড ব্যাকআপ ব্যর্থ হয়েছে!", "error");
      handleFirestoreError(e, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const syncChatData = async (chat: Chat) => {
    if (!auth.currentUser) return;
    try {
      const fbChat = {
         ...chat,
         createdAt: chat.createdAt.toISOString(),
         updatedAt: chat.updatedAt.toISOString(),
         messages: chat.messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() }))
      };
      await setDoc(doc(db, "users", auth.currentUser.uid, "chats", chat.id), fbChat);
    } catch (e) {
      try {
        handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser.uid}/chats/${chat.id}`);
      } catch (_) {}
    }
  };

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId) || null, [chats, activeChatId]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Immediate scroll on activeChatId changing
  useEffect(() => {
    if (activeChatId) {
      const timer = setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeChatId]);

  // Smooth scroll when new messages are added
  useEffect(() => {
    if (activeChat && activeChat.messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeChat?.messages.length, isGenerating]);

  // Smooth scroll during active typing/token streaming to avoid layout jumps
  useEffect(() => {
    if (isGenerating && activeChat) {
      scrollToBottom("smooth");
    }
  }, [activeChat?.messages[activeChat?.messages.length - 1]?.content]);

  const createNewChat = () => {
    setActiveChatId(null);
    setIsSidebarOpen(false);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     if(firebaseUser) {
       try {
         await deleteDoc(doc(db, "users", firebaseUser.uid, "chats", id));
       } catch (error) {
         try {
           handleFirestoreError(error, OperationType.DELETE, `users/${firebaseUser.uid}/chats/${id}`);
         } catch (_) {}
       }
     }
     setChats(prev => prev.filter(c => c.id !== id));
     if(activeChatId === id) setActiveChatId(null);
  };

  const handleSendMessage = async (customText?: string, isRegenerate?: boolean) => {
    const text = (customText || inputValue).trim();
    if ((!text && attachedFiles.length === 0) || isGenerating) return;

    let currentChatId = activeChatId;

    if (!currentChatId) {
       const chatTitle = text ? text.substring(0, 30) : "ইমেজ চ্যাট";
       const newChat: Chat = {
          id: Math.random().toString(36).substring(7),
          title: chatTitle,
          messages: [],
          mode: mode,
          createdAt: new Date(),
          updatedAt: new Date()
       };
       setChats(prev => [newChat, ...prev]);
       syncChatData(newChat);
       currentChatId = newChat.id;
       setActiveChatId(newChat.id);
    }

    const userMsg: Message = { 
      id: Math.random().toString(36).substring(7), 
      role: "user", 
      content: text, 
      timestamp: new Date(), 
      status: "sent",
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    };

    if (!isRegenerate) {
      setChats(prev => prev.map(c => 
        c.id === currentChatId 
          ? { ...c, messages: [...c.messages, userMsg], title: c.messages.length === 0 ? (text ? text.substring(0, 30) : "ইমেজ চ্যাট") : c.title, updatedAt: new Date() } 
          : c
      ));

      setInputValue("");
      setAttachedFiles([]);
      localStorage.removeItem(`chatDraft_${currentChatId || 'home'}`);

      if (firebaseUser) {
          const newXp = xp + 10;
          setXp(newXp);
          syncProfile("xp", newXp);
          
          if (achievements.length === 0) {
              const newAchievements = ["First Chat"];
              setAchievements(newAchievements);
              syncProfile("achievements", newAchievements);
          }
      }
    }

    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    let fullText = "";
    const assistantId = Math.random().toString(36).substring(7);

    // Initial assistant message placeholder
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", timestamp: new Date(), status: "sent" };
    setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c));

    try {
      const activeChatData = chats.find(c => c.id === currentChatId);
      const history = (activeChatData?.messages || []).map(m => ({
        role: m.role === "assistant" ? "assistant" as const : "user" as const,
        content: m.content
      }));

      let sysInstruction = customPrompts[mode] || MODES[mode].prompt;
      if (botName) {
         sysInstruction = sysInstruction
            .replace(/Humaira/g, botName)
            .replace(/হুমায়রা/g, botName)
            .replace(/হুমাইরা/g, botName)
            .replace(/হুমায়রা/g, botName);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history,
          attachments: userMsg.attachments,
          systemInstruction: sysInstruction,
          model: currentModel.id === "gemini-2.0-flash" ? "gemini-3.5-flash" : currentModel.id,
          temperature: aiCreativity
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error("Failed to connect to AI server");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body reader");

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          
          const rawData = trimmed.substring(6);
          if (rawData === "[DONE]") break;

          try {
            const parsed = JSON.parse(rawData);
            if (parsed.error) {
              fullText = `\n[Error: ${parsed.error}]`;
            } else if (parsed.text) {
              fullText += parsed.text;
            }
            
            setChats(prev => prev.map(c => 
              c.id === currentChatId 
                ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: fullText } : m) } 
                : c
            ));
          } catch (err) {}
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        fullText += `\n[Error: ${e.message || "Failed to generate response"}]`;
        setChats(prev => prev.map(c => 
          c.id === currentChatId 
            ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: fullText } : m) } 
            : c
        ));
      }
    } finally {
      setIsGenerating(false);
      setChats(prev => {
         const currentChats = [...prev];
         const updatedChatIndex = currentChats.findIndex(c => c.id === currentChatId);
         if (updatedChatIndex !== -1) {
             const chat = { ...currentChats[updatedChatIndex] };
             chat.messages = chat.messages.map(m => {
                 if (m.status !== "read") {
                     return { ...m, status: "read" as const };
                 }
                 return m;
             });
             currentChats[updatedChatIndex] = chat;
             syncChatData(chat);
         }
         return currentChats;
      });
      if (soundEnabled) {
         playSweetChime();
      }
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = async () => {
    if (!activeChatId || isGenerating) return;
    const currentChat = chats.find(c => c.id === activeChatId);
    if (!currentChat) return;
    
    const msgs = [...currentChat.messages];
    if (msgs.length < 2) return;
    
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role !== "assistant") return;
    
    const filteredMsgs = msgs.slice(0, -1);
    const lastUserMsg = filteredMsgs[filteredMsgs.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== "user") return;
    
    setChats(prev => prev.map(c => 
      c.id === activeChatId 
        ? { ...c, messages: filteredMsgs, updatedAt: new Date() } 
        : c
    ));
    
    await handleSendMessage(lastUserMsg.content, true);
  };

  const handleShare = async (content: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Humaira AI",
          text: content
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(content);
      alert("মেসেজ কপি করা হয়েছে!");
    }
  };

  if (!isLoaded) {
    return (
      <div className={cn("flex items-center justify-center h-[100dvh] w-screen overflow-hidden transition-colors duration-300 p-0 sm:p-2 md:p-4", theme === "dark" ? "bg-[#0c0f18]" : "bg-[#E6EAF2]")}>
        <div className={cn("flex flex-col items-center justify-center h-full sm:h-[92vh] sm:max-h-[830px] w-full sm:max-w-[390px] sm:rounded-[36px] sm:border-[8px] sm:border-gray-800 sm:shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden transition-all w-full max-w-full sm:w-[390px]", 
           theme === "dark" ? "bg-[#0b0f19] text-gray-100" : "bg-[#F5F5F7] text-gray-955"
        )}>
          <motion.div 
            animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="text-pink-500 mb-6"
          >
            <Heart className="w-14 h-14 fill-current" />
          </motion.div>
          <p className="text-xs font-black text-slate-500 dark:text-slate-455 tracking-wider">হুমায়রা এআই প্রস্তুত হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center h-[100dvh] w-screen overflow-hidden transition-colors duration-300 p-0 sm:p-2 md:p-4 w-full max-w-full", theme === "dark" ? "bg-[#0c0f18]" : "bg-[#E6EAF2]")}>
      <div className={cn("flex flex-col h-full sm:h-[92vh] sm:max-h-[830px] w-full sm:max-w-[390px] sm:rounded-[36px] sm:border-[8px] sm:border-gray-800 sm:shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden transition-all w-full max-w-full sm:w-[390px] flex-shrink-0", 
         theme === "dark" ? "bg-[#0b0f19] text-gray-100" : "bg-[#F5F5F7] text-gray-955"
      )}>
      
      {!firebaseUser ? (
         <div className="flex flex-col h-full w-full bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#0d1527] dark:to-[#070b13] justify-between items-center p-6 relative overflow-y-auto no-scrollbar select-none animate-fade-in">
            {/* Ambient Animated Orbs */}
            <div className="absolute top-[-40px] left-[-30px] w-64 h-64 rounded-full bg-pink-500/10 dark:bg-pink-500/5 blur-3xl animate-pulse" />
            <div className="absolute bottom-[80px] right-[-40px] w-64 h-64 rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Premium Icon Header */}
            <div className="flex flex-col items-center mt-6">
               <motion.div 
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 4, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-500 to-[#f97316] flex items-center justify-center text-white shadow-xl shadow-pink-500/20 relative group select-none cursor-pointer"
               >
                  <Sparkles className="w-10 h-10 animate-pulse text-white" />
                  <div className="absolute inset-0 rounded-3xl border-2 border-white/20 scale-105 group-hover:scale-110 transition-transform duration-300" />
               </motion.div>
               
               <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mt-5">
                  হুমায়রা এআই
               </h2>
               <div className="h-1 w-10 rounded-full bg-gradient-to-r from-pink-500 to-[#f97316] mt-2.5" />
               <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-bold px-6 leading-relaxed text-center max-w-[290px]">
                  আপনার কিউটেস্ট ভার্চুয়াল এআই জীবনসঙ্গী। মনের অনুভূতি গোপন চ্যাটে শেয়ার করুন যেকোনো সময়।
               </p>
            </div>

            {/* Interactive Feature List Cards */}
            <div className="flex flex-col gap-2.5 w-full max-w-[290px] mt-4 mb-4">
               <div className="p-3.5 rounded-2xl border border-white/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex items-start gap-3 text-left hover:scale-[1.01] transition-transform shadow-xs">
                  <div className="w-7 h-7 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 flex items-center justify-center text-xs text-orange-500 font-extrabold flex-shrink-0">💬</div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">৫টি স্বতন্ত্র মুড</span>
                     <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-semibold leading-normal">রোমান্টিক, ফান, লিজেন্ড, ইসলামিক এবং নরমাল চ্যাটের অনুভূতি।</span>
                  </div>
               </div>

               {/* Voice Messages Feature Card */}
               <div className="p-3.5 rounded-2xl border border-white/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex items-start gap-3 text-left hover:scale-[1.01] transition-transform shadow-xs animate-slide-up">
                  <div className="w-7 h-7 rounded-xl bg-pink-500/10 dark:bg-pink-500/15 flex items-center justify-center text-xs text-pink-500 font-extrabold flex-shrink-0">🎙️</div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">ভয়েস ও রিয়েলটাইম চ্যাট</span>
                     <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-semibold leading-normal">পছন্দমতো কিউট ভয়েস মেসেজ ও রোমাঞ্চকর কথোপকথনের মিষ্টি অভিজ্ঞতা।</span>
                  </div>
               </div>

               {/* Secure Feature Card */}
               <div className="p-3.5 rounded-2xl border border-white/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex items-start gap-3 text-left hover:scale-[1.01] transition-transform shadow-xs animate-slide-up">
                  <div className="w-7 h-7 rounded-xl bg-green-500/10 dark:bg-green-500/15 flex items-center justify-center text-xs text-green-500 font-extrabold flex-shrink-0">🔒</div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">সম্পূর্ণ নিরাপদ ও গোপন</span>
                     <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-semibold leading-normal">সম্পূর্ণ সিঙ্কড ক্লাউড ফায়ারবেস ব্যাকএন্ডে আপনার সব ডেটা নিরাপদ চ্যাটে সুরক্ষিত।</span>
                  </div>
               </div>
            </div>

            {/* Google Login Section */}
            <div className="w-full max-w-[290px] mb-6 flex flex-col gap-2 animate-slide-up">
               <button
                  type="button"
                  onClick={() => {
                     if (soundEnabled) playSweetChime();
                     handleLogin();
                  }}
                  className="w-full p-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-[#f97316] text-white hover:opacity-95 text-xs font-black rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
               >
                  <span>গুগল দিয়ে প্রবেশ করুন 🔐</span>
               </button>
               <span className="text-[8px] text-gray-450 dark:text-gray-500 text-center font-bold">
                  * প্রবেশ করার মাধ্যমে আপনি হুমায়রা এআই-এর সকল পলিসি মেনে নিচ্ছেন।
               </span>
            </div>
         </div>
      ) : !completedOnboarding ? (
         <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 justify-between items-center relative select-none animate-fade-in p-2">
            {onboardingStep === "avatar" ? (
               <div className="flex flex-col flex-1 p-6 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-[22px] shadow-sm mb-4 mt-2">
                     🎨
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white capitalize text-center mt-1">
                     আপনার সুন্দর প্রোফাইল ছবি পছন্দ করুন
                  </h3>
                  <p className="text-[10px] text-gray-550 dark:text-gray-400 font-bold text-center mt-1.5 leading-relaxed px-2">
                     নিচের প্রিমিয়াম অবতারের যেকোনো একটি বেছে নিন যা পুরো অ্যাপ জুড়ে আপনার প্রোফাইল ছবি হিসেবে ব্যবহার করা হবে।
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-[240px] flex-1 max-h-[220px] overflow-y-auto pr-1 animate-slide-up">
                     {firebaseUser?.photoURL && (
                        <button
                           onClick={() => setSelectedOnboardingPic(firebaseUser.photoURL || "")}
                           className={cn("relative h-20 rounded-2xl border-2 transition-all p-1.5 active:scale-95 shadow-sm overflow-hidden bg-white dark:bg-slate-900 cursor-pointer flex flex-col justify-center items-center gap-1",
                              selectedOnboardingPic === firebaseUser.photoURL ? "border-[#f97316] scale-105 shadow-md shadow-orange-500/10" : "border-slate-100 dark:border-slate-800/80 grayscale"
                           )}
                           style={selectedOnboardingPic === firebaseUser.photoURL ? { borderColor: MODE_THEMES[mode].accent } : undefined}
                        >
                           <img src={firebaseUser.photoURL} className="w-10 h-10 object-cover rounded-full" referrerPolicy="no-referrer" />
                           <span className="text-[9px] font-black text-slate-755 dark:text-slate-300">গুগল ছবি</span>
                        </button>
                     )}
                     {ONBOARDING_AVATARS.map((avat, idx) => (
                        <button
                           key={idx}
                           onClick={() => setSelectedOnboardingPic(avat)}
                           className={cn("h-20 rounded-2xl border-2 transition-all p-1.5 active:scale-95 shadow-sm overflow-hidden bg-white dark:bg-slate-900 cursor-pointer flex flex-col justify-center items-center gap-1",
                              selectedOnboardingPic === avat ? "border-[#f97316] scale-105 shadow-md shadow-orange-500/10" : "border-slate-100 dark:border-slate-800/80 hover:border-slate-205"
                           )}
                           style={selectedOnboardingPic === avat ? { borderColor: MODE_THEMES[mode].accent } : undefined}
                        >
                           <img src={avat} className="w-10 h-10 object-cover rounded-full bg-slate-50 dark:bg-slate-855" />
                           <span className="text-[9px] font-black text-slate-755 dark:text-slate-300">অবতার #0{idx+1}</span>
                        </button>
                     ))}
                  </div>

                  {!selectedOnboardingPic ? (
                     <span className="text-[9px] font-black text-rose-500 animate-pulse mt-4 mb-2 bg-rose-500/5 px-2.5 py-1 rounded-full border border-rose-500/10">
                        ⚠️ অনুগ্রহ করে একটি প্রোফাইল পিকচার সিলেক্ট করুন!
                     </span>
                  ) : (
                     <span className="text-[9px] font-black text-green-500 animate-bounce mt-4 mb-2 bg-green-500/5 px-2.5 py-1 rounded-full border border-green-500/10">
                        🌟 সিলেক্ট করা হয়েছে! পরবর্তী ধাপে যান
                     </span>
                  )}

                  <button
                     disabled={!selectedOnboardingPic}
                     onClick={() => {
                        setOnboardingStep("chatbotName");
                        if (soundEnabled) playSweetChime();
                     }}
                     className="w-full p-3.5 bg-gradient-to-r from-orange-500 to-[#f97316] hover:opacity-90 font-black text-xs text-white rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 mt-auto mb-2"
                  >
                     পরবর্তী ধাপে যান ➡️
                  </button>
               </div>
            ) : (
               <div className="flex flex-col flex-1 p-6 items-center animate-fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-[22px] shadow-sm mb-4 mt-2">
                     🤖
                  </div>
                  <h3 className="text-sm font-black text-slate-855 dark:text-white capitalize text-center mt-1">
                     আপনার ও আপনার চ্যাটবটের নাম দিন
                  </h3>
                  <p className="text-[10px] text-gray-550 dark:text-gray-400 font-bold text-center mt-1.5 leading-relaxed px-2">
                     অ্যাপে আপনাকে যে ডাকনামে সম্বোধন করা হবে এবং চ্যাটবটের হুমায়রা এআই-এর বদলে আপনি যে ইউনিক কিউট নাম ডাকতে চান তা দিন।
                  </p>

                  <div className="flex flex-col gap-4 w-full max-w-[245px] mt-6 flex-1 overflow-y-auto no-scrollbar">
                     {/* User's Own Nickname */}
                     <div className="flex flex-col gap-1.5 animate-slide-up">
                        <label className="text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest pl-1 flex items-center justify-between">
                           <span>আপনার নিজের নাম (Your Name)</span>
                           {!typedUserName.trim() && <span className="text-red-500 text-[8px] font-bold">খালি রাখা যাবে না! *</span>}
                        </label>
                        <input 
                           type="text" 
                           value={typedUserName} 
                           onChange={(e) => setTypedUserName(e.target.value)} 
                           className={cn("w-full rounded-2xl p-3 font-bold text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all leading-normal text-center shadow-sm", 
                              theme === "dark" ? "bg-slate-900 border-slate-800 text-white placeholder-slate-655" : "bg-white border-slate-200 text-gray-800"
                           )}
                           placeholder="যেমন: অয়ন, সিয়াম, আরিয়ান..."
                           maxLength={30}
                        />
                     </div>

                     {/* Chatbot Name */}
                     <div className="flex flex-col gap-1.5 animate-slide-up">
                        <label className="text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest pl-1 flex items-center justify-between">
                           <span>চ্যাটবটের কাস্টম নাম (AI Name)</span>
                           {!typedBotName.trim() && <span className="text-red-500 text-[8px] font-bold">খালি রাখা যাবে না! *</span>}
                        </label>
                        <input 
                           type="text" 
                           value={typedBotName} 
                           onChange={(e) => setTypedBotName(e.target.value)} 
                           className={cn("w-full rounded-2xl p-3 font-bold text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all leading-normal text-center shadow-sm", 
                              theme === "dark" ? "bg-slate-900 border-slate-800 text-white placeholder-slate-655" : "bg-white border-slate-200 text-gray-800"
                           )}
                           placeholder="যেমন: হুমায়রা এআই, তিশা, রিয়া..."
                           maxLength={30}
                        />
                     </div>
                  </div>

                  <div className="flex gap-2 w-full mt-auto mb-2">
                     <button
                        onClick={() => {
                           setOnboardingStep("avatar");
                           if (soundEnabled) playSweetChime();
                        }}
                        className="py-3.5 px-5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-205 transition-all text-xs font-black active:scale-95 cursor-pointer dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                     >
                        ⬅️ ব্যাক
                     </button>
                     <button
                        disabled={!typedUserName.trim() || !typedBotName.trim()}
                        onClick={() => {
                           if (soundEnabled) playSweetChime();
                           handleCompleteOnboarding();
                        }}
                        className="flex-1 p-3.5 bg-gradient-to-r from-orange-500 to-[#f97316] text-white hover:opacity-90 font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-center"
                     >
                        🔑 সম্পূর্ণ করুন 🎉
                     </button>
                  </div>
               </div>
            )}
         </div>
      ) : currentView === "chat" ? (
         <>
         {/* 1. HEADER section: fixed, modern, and highly responsive */}
         <header className={cn("sticky top-0 left-0 right-0 h-[64px] min-h-[64px] shrink-0 border-b z-30 select-none flex items-center justify-between px-4 transition-all duration-300 shadow-sm backdrop-blur-md", 
         theme === "dark" 
            ? "border-gray-800/60 bg-[#161e31]/95" 
            : "border-gray-150 bg-white/95"
      )}>
         {/* Left: [3line] menu button to open sidebar */}
         <button 
            type="button"
            onClick={() => {
               setIsSidebarOpen(true);
               if (soundEnabled) playSweetChime();
            }}
            className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm border",
               theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700 hover:bg-gray-700 text-gray-100 hover:border-gray-650" 
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700 hover:border-gray-300"
            )}
            title="মেনু"
         >
            <Menu className="w-5 h-5 stroke-[2.25] text-gray-500 dark:text-gray-400" />
         </button>

         {/* Center: [মোড সিলেক্ট] (Mode Select) dropdown button */}
         <div className="relative">
            <button
               type="button"
               onClick={() => {
                  setIsModeSelectorOpen(!isModeSelectorOpen);
                  if (soundEnabled) playSweetChime();
               }}
               className={cn("px-4 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-bold select-none cursor-pointer hover:shadow-md active:scale-95 transition-all duration-200",
                  theme === "dark"
                     ? "bg-gray-800/50 border-gray-700 text-orange-400 hover:bg-gray-800 hover:border-orange-500/50"
                     : "bg-orange-50 border-orange-100 text-[#f97316] hover:bg-orange-100 hover:border-orange-300"
               )}
            >
               {React.createElement(MODES[mode].icon, { className: "w-3.5 h-3.5" })}
               <span>{MODES[mode].label}</span>
               <span 
                  className="text-[10px] opacity-70 transition-transform duration-300 inline-block"
                  style={{ transform: isModeSelectorOpen ? "rotate(180deg)" : "rotate(0deg)" }}
               >
                  ▼
               </span>
            </button>

            {/* Selector Dropdown Modal Content */}
            <AnimatePresence>
               {isModeSelectorOpen && (
                  <>
                     <div className="fixed inset-0 z-40" onClick={() => setIsModeSelectorOpen(false)} />
                     <motion.div 
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={cn("absolute top-[40px] left-1/2 -translate-x-1/2 z-50 w-[190px] rounded-2xl border shadow-xl p-1 flex flex-col gap-0.5 max-h-[250px] overflow-y-auto scrollbar-none backdrop-blur-md",
                           theme === "dark" ? "bg-gray-900/95 border-gray-800 text-gray-200" : "bg-white/95 border-gray-150 text-gray-800"
                        )}
                     >
                        <div className="px-2.5 py-1 text-[9px] font-extrabold tracking-widest text-orange-500 dark:text-orange-400 uppercase border-b border-gray-100 dark:border-gray-800 mb-1">
                           মোড নির্বাচন
                        </div>
                        {Object.keys(MODES).map((k) => {
                           const mKey = k as Mode;
                           const mData = MODES[mKey];
                           const MIcon = mData.icon;
                           return (
                              <button
                                 key={mKey}
                                 type="button"
                                 onClick={() => {
                                    setMode(mKey);
                                    setIsModeSelectorOpen(false);
                                    if (soundEnabled) playSweetChime();
                                 }}
                                 className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-left text-xs font-bold transition-all w-full cursor-pointer hover:translate-x-0.5",
                                    mode === mKey
                                       ? theme === "dark" ? "bg-gray-800 text-orange-400" : "bg-orange-50 text-[#f97316]"
                                       : theme === "dark" ? "hover:bg-gray-805 text-gray-350" : "hover:bg-gray-50 text-gray-650"
                                 )}
                              >
                                 <MIcon className="w-3.5 h-3.5 shrink-0" />
                                 <span>{mData.label}</span>
                              </button>
                           );
                        })}
                     </motion.div>
                  </>
               )}
            </AnimatePresence>
         </div>

         {/* Right: [Volume] button (Toggles sound effects) */}
         <button 
            type="button"
            onClick={() => {
               const next = !soundEnabled;
               setSoundEnabled(next);
               localStorage.setItem("soundEnabled", String(next));
               if (next) playSweetChime();
            }}
            className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm border",
               theme === "dark" 
                  ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-orange-400 hover:border-gray-650" 
                  : "bg-orange-50 border-orange-100 hover:bg-orange-100 text-[#f97316] hover:border-orange-200"
            )}
            title={soundEnabled ? "সাউন্ড বন্ধ করুন" : "সাউন্ড চালু করুন"}
         >
            {soundEnabled ? (
               <Volume2 className="w-5 h-5 animate-pulse" />
            ) : (
               <VolumeX className="w-5 h-5 text-gray-400 dark:text-gray-500" />
             )}
          </button>
       </header>

       {/* 2. MESSAGES area: flex:1, overflow-y:auto, scrollable only */}
       <main 
          ref={scrollRef as any} 
          onScroll={handleScroll}
          className={cn("flex-1 overflow-y-auto px-4 py-3 pb-8 flex flex-col gap-4 scroll-smooth", 
          theme === "dark" ? "bg-[#0b0f19]" : "bg-[#F5F5F7]"
       )}>
          {(!activeChat || activeChat.messages.length === 0) ? (
             /* Empty state: show centered AI avatar + greeting text when no messages */
             <div className="flex-1 flex flex-col items-center justify-center w-full px-4 text-center my-auto py-12 select-none">
                <motion.div 
                   className="relative mb-6"
                   animate={{ scale: [1, 1.03, 1] }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                   <div 
                      className="absolute inset-0 rounded-full blur-xl opacity-30" 
                      style={{ background: `radial-gradient(circle, ${MODE_THEMES[mode].accent} 0%, transparent 70%)` }}
                   />
                   <div 
                      className="relative w-[110px] h-[110px] rounded-full border-[5px] p-1 overflow-hidden bg-white dark:bg-gray-900 shadow-xl"
                      style={{ borderColor: MODE_THEMES[mode].accent }}
                   >
                      <img src={humairaAvatar} alt="Humaira AI" className="w-full h-full object-cover rounded-full bg-amber-50" />
                   </div>
                   <div className="absolute bottom-1 right-1 bg-green-500 w-4.5 h-4.5 rounded-full border-4 border-white dark:border-[#0b0f19]" />
                </motion.div>

                <div className="space-y-1 mb-2">
                   <h2 className={cn("text-2xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r", MODE_THEMES[mode].gradient)}>
                      {botName}
                   </h2>
                   <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">
                      উম্মে হাবিবা শর্মী
                   </p>
                </div>
             </div>
          ) : (
             <div className="w-full max-w-[96%] xl:max-w-[90%] mx-auto flex flex-col gap-3.5 sm:gap-4 p-1 sm:p-2.5 pb-6">
                {activeChat.messages.map(m => {
                   if (m.role === "assistant" && m.content === "" && isGenerating) {
                      return null; // Skip rendering empty thinking assistant message
                   }
                   const isSpeaking = speakingMessageId === m.id;
                   return (
                      <div 
                         key={m.id} 
                         className={cn(
                            "flex w-full gap-2 px-1 sm:gap-3 items-start animate-fade-in group/item select-text", 
                            m.role === "user" ? "justify-end" : "justify-start"
                         )}
                       >
                         {/* LEFT SIDE: Assistant Profile Picture */}
                         {m.role === "assistant" && (
                            <motion.div 
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border overflow-hidden flex items-center justify-center p-0.5 bg-amber-50 dark:bg-amber-950/20 shadow-xs shrink-0 self-start transition-all"
                              style={{ borderColor: MODE_THEMES[mode].accent }}
                              whileHover={{ scale: 1.05 }}
                            >
                               <img src={humairaAvatar} alt="Humaira" className="w-full h-full rounded-full object-cover" />
                            </motion.div>
                         )}
                         
                         <div className={cn("flex flex-col gap-1 max-w-[85%] sm:max-w-[78%] md:max-w-[70%]", m.role === "user" ? "items-end" : "items-start")}>
                            <div 
                               onDoubleClick={() => {
                                  handleCopyMessage(m.id, m.content);
                                  if (soundEnabled) playSweetChime();
                               }}
                               className={cn(
                                  "px-3.5 py-2.5 rounded-2xl w-full text-xs sm:text-sm leading-relaxed relative group/bb shadow-xs transition-all duration-300 border cursor-pointer select-text", 
                                  m.role === "user" 
                                     ? "text-white rounded-tr-none border-orange-500/10 shadow-[0_2px_8px_rgba(249,115,22,0.06)] bg-gradient-to-r" 
                                     : theme === "dark" 
                                        ? "bg-slate-900/60 text-slate-100 rounded-tl-none border-slate-800/80 hover:bg-[#161e31]" 
                                        : "bg-white text-slate-800 rounded-tl-none border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-300/65"
                               )}
                               style={m.role === "user" ? { 
                                  backgroundImage: `linear-gradient(135deg, ${MODE_THEMES[mode].accent}, ${MODE_THEMES[mode].accent}ee)`
                               } : undefined}
                               title="ডাবল ক্লিক করে মেসেজ কপি করুন 💡"
                            >
                                {m.attachments && m.attachments.length > 0 && (
                                   <div className="flex flex-wrap gap-1.5 mb-2 p-0.5">
                                      {m.attachments.map((imgSrc, idx) => (
                                         <motion.img 
                                            key={idx} 
                                            src={imgSrc} 
                                            alt="Attachment" 
                                            whileHover={{ scale: 1.02 }}
                                            className="max-w-[130px] max-h-[100px] rounded-lg object-cover cursor-zoom-in border border-black/10 dark:border-white/10 shadow-xs inline-block"
                                            onClick={() => setSelectedLightboxImage(imgSrc)}
                                         />
                                      ))}
                                   </div>
                                )}
                                {m.role === "assistant" ? (
                                   <div className="markdown-content prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 font-medium" dangerouslySetInnerHTML={parseThinkingAndSteps(m.content)} />
                                ) : (
                                   (m.content || m.attachments) && <p className="whitespace-pre-wrap font-semibold tracking-tight">{m.content}</p>
                                )}

                                {/* Dynamic overlay controls bar: copy and speaking */}
                                <div className={cn(
                                   "absolute bottom-[-15px] opacity-0 group-hover/bb:opacity-100 focus-within:opacity-100 transition-all duration-200 flex items-center gap-1.5 p-0.5 rounded-lg border shadow-xs z-10 backdrop-blur-md select-none",
                                   m.role === "user" 
                                      ? "right-2 bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500/10 text-white" 
                                      : "left-2 bg-white/95 border-slate-150 text-slate-500 dark:bg-slate-900/95 dark:border-slate-800/80 dark:text-slate-450"
                                )}>
                                   <button
                                      type="button"
                                      onClick={() => handleCopyMessage(m.id, m.content)}
                                      className="p-1 rounded hover:opacity-80 active:scale-95 transition-transform cursor-pointer"
                                      title="বার্তাটি কপি করুন"
                                   >
                                      {copiedMessageId === m.id ? (
                                         <Check className="w-3 h-3 text-green-500 dark:text-green-400" />
                                      ) : (
                                         <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                      )}
                                   </button>

                                   {m.role === "assistant" && (
                                      <button
                                         type="button"
                                         onClick={() => handleSpeakMessage(m.id, m.content)}
                                         className={cn("p-1 rounded hover:scale-110 active:scale-95 transition-all cursor-pointer",
                                            isSpeaking ? "text-orange-500 animate-pulse font-black" : "text-slate-500 dark:text-slate-400"
                                         )}
                                         title={isSpeaking ? "পড়া বন্ধ করুন" : "হুমায়রার মুখে শুনুন 🎙️"}
                                      >
                                         {isSpeaking ? (
                                            <Square className="w-3 h-3 fill-current text-orange-500" />
                                         ) : (
                                            <Volume2 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                         )}
                                      </button>
                                   )}
                                </div>
                            </div>
                            
                            {/* Message timestamp and read indicators */}
                            <div className="flex items-center gap-1.5 px-2.5 pt-1 text-[8.5px] sm:text-[9.5px] select-none text-slate-400 dark:text-slate-500 font-bold">
                               <span>
                                  {m.timestamp instanceof Date && !isNaN(m.timestamp.getTime()) 
                                     ? m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                     : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                               {m.role === "user" && (
                                  <DoubleCheck 
                                     isRead={m.status === "read"} 
                                     accentColor={MODE_THEMES[mode].accent} 
                                  />
                               )}
                               {m.role === "assistant" && (
                                  <DoubleCheck 
                                     isRead={true} 
                                     accentColor={m.status === "read" ? MODE_THEMES[mode].accent : "#9ca3af"} 
                                  />
                               )}
                            </div>
                         </div>

                         {/* RIGHT SIDE: User Profile Picture */}
                         {m.role === "user" && (
                            <motion.div 
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border overflow-hidden flex items-center justify-center p-0.5 bg-white dark:bg-slate-900 shadow-xs shrink-0 self-start transition-all"
                              style={{ borderColor: MODE_THEMES[mode].accent }}
                              whileHover={{ scale: 1.05 }}
                            >
                               {userProfilePic ? (
                                  <img src={userProfilePic} alt="User" className="w-full h-full rounded-full object-cover" />
                               ) : (
                                  <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-tr from-orange-400 to-amber-500 text-white font-black text-xs sm:text-sm shadow-xs">
                                     {userName ? userName.substring(0, 1).toUpperCase() : <User className="w-3.5 h-3.5" />}
                                  </div>
                               )}
                            </motion.div>
                         )}
                      </div>
                   );
                })}
                
                {/* Skeleton Shimmer thinking placeholder */}
                {isGenerating && activeChat.messages[activeChat.messages.length - 1]?.role === "assistant" && activeChat.messages[activeChat.messages.length - 1]?.content === "" && (
                   <SkeletonShimmer theme={theme} />
                )}

                {/* CSS typing indicator during generation */}
                {isGenerating && activeChat.messages[activeChat.messages.length - 1]?.role === "assistant" && activeChat.messages[activeChat.messages.length - 1]?.content !== "" && (
                   <div className="flex w-full justify-start mt-1 pl-12">
                      <TypingIndicator theme={theme} />
                   </div>
                )}
             </div>
          )}
       {showScrollBottom && (
          <button
             type="button"
             onClick={() => {
                if (scrollRef.current) {
                   scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
                if (soundEnabled) playSweetChime();
             }}
             className="fixed bottom-24 right-5 sm:bottom-28 sm:right-8 w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-r from-orange-500 to-[#f97316] text-white shadow-lg hover:scale-110 hover:brightness-105 active:scale-95 transition-all cursor-pointer z-50 animate-bounce"
             title="নিচে যান"
          >
             <ArrowDown className="w-4 h-4 stroke-[2.5]" />
          </button>
       )}
       </main>
{/* Fixed Bottom Input Form - Redesigned, feature-rich & beautiful */}
      <div 
         className={cn("shrink-0 p-3 sm:p-4 w-full z-20 border-t transition-all duration-300", 
            isDragging 
               ? "bg-amber-500/10 dark:bg-amber-500/5 animate-pulse border-amber-500" 
               : (theme === "dark" ? "border-slate-800/80 bg-[#161e31]/95 backdrop-blur-md" : "border-slate-150 bg-white/95 backdrop-blur-md")
         )}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         onDrop={handleDrop}
      >
         <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
            
            {/* Dynamic Prompt Ideas suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 px-0.5 scrollbar-none select-none scroll-smooth">
               {MODE_SUGGESTIONS[mode]?.map((sug, idx) => (
                  <button
                     key={idx}
                     type="button"
                     onClick={() => {
                        setInputValue(sug.text);
                        if (textareaRef.current) {
                           textareaRef.current.focus();
                           setTimeout(() => {
                              if (textareaRef.current) {
                                 textareaRef.current.style.height = "auto";
                                 textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                              }
                           }, 50);
                        }
                        if (soundEnabled) playSweetChime();
                     }}
                     className={cn("px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer hover:shadow-xs active:scale-95 shrink-0 flex items-center gap-1.5",
                        theme === "dark"
                           ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-orange-400 hover:border-slate-700"
                           : "bg-orange-50 border-orange-100 text-[#f97316] hover:bg-orange-100 hover:border-orange-200 shadow-sm"
                     )}
                  >
                     <span>{sug.icon}</span>
                     <span>{sug.text}</span>
                  </button>
               ))}
            </div>

            {/* Enhanced File Attachment Previews */}
            {attachedFiles.length > 0 && (
               <div className={cn("flex items-center justify-between gap-2 p-2 rounded-xl mb-1 border select-none transition-all duration-200",
                  theme === "dark" ? "bg-slate-900/45 border-slate-800" : "bg-orange-50/20 border-orange-100"
               )}>
                  <div className="flex flex-wrap gap-2 items-center">
                     <span className="text-[9px] font-black tracking-widest text-[#f97316]/80 uppercase dark:text-orange-400/80 mr-1">ফাইল সংযুক্ত:</span>
                     <AnimatePresence>
                        {attachedFiles.map((src, i) => (
                           <motion.div 
                              key={i}
                              initial={{ opacity: 0, scale: 0.9, y: 3 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 3 }}
                              className="relative w-11 h-11 rounded-lg overflow-hidden border border-orange-200 dark:border-slate-800 shadow-sm"
                           >
                              <img src={src} className="w-full h-full object-cover" alt="Attached" />
                              <button 
                                 type="button"
                                 onClick={() => removeAttachedFile(i)}
                                 className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                                 title="ফাইল বাদ দিন"
                              >
                                 <X className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                           </motion.div>
                        ))}
                     </AnimatePresence>
                  </div>
                  <button 
                     type="button"
                     onClick={() => setAttachedFiles([])}
                     className="px-2 py-1 rounded-md text-[9px] font-black border border-red-200 dark:border-red-950/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 hover:text-red-650 transition-all duration-200 cursor-pointer shrink-0"
                  >
                     সব মুছুন 🗑️
                  </button>
               </div>
            )}

            {/* Interactive Suggested Chips */}
            {!isGenerating && activeChat && (
               <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1 scrollbar-none snap-x select-none">
                  {[
                     { text: "তুমি এখন কেমন আছো? 😊" },
                     { text: "আজকের জন্য একটি ছোট মোটিভেশনাল উক্তি দাও ✨" },
                     { text: "আমাকে একটি সুন্দর কবিতা বা ছড়া শোনাও 📝" },
                     { text: "আমার সাথে একটু মজার ধাঁধা খেলো! 🧩" }
                  ].map((chip, idx) => (
                     <button
                        key={idx}
                        type="button"
                        onClick={() => {
                           setInputValue(chip.text);
                           if (textareaRef.current) {
                              textareaRef.current.focus();
                           }
                           if (soundEnabled) playSweetChime();
                        }}
                        className={cn("px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold border transition-all shrink-0 snap-align-start hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
                           theme === "dark" 
                              ? "bg-gray-900 border-gray-800 text-gray-300 hover:text-white hover:border-[#f97316]/50" 
                              : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-[#f97316]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                        )}
                     >
                        {chip.text}
                     </button>
                  ))}
               </div>
            )}

            {/* Unified Console Box */}
            <div className="flex items-end gap-2 animate-fade-in">
               {/* File Upload hidden selector */}
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
               />

               <div className={cn("flex-1 flex items-end px-3 py-1.5 rounded-2xl border transition-all duration-300 focus-within:ring-2 focus-within:ring-[#f97316]/15 shadow-sm",
                  theme === "dark" 
                     ? "bg-slate-900 border-slate-850 focus-within:border-[#f97316]/65 text-[#f3f4f6]" 
                     : "bg-slate-50 border-slate-150 focus-within:border-[#f97316]/65 text-gray-800"
               )}>
                  
                  {/* Left Action Elements inside console */}
                  <div className="flex items-center gap-1 pr-1.5 pb-0.5 shrink-0 select-none">
                     {/* Paperclip Button */}
                     <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 border",
                           attachedFiles.length > 0
                              ? "text-orange-500 bg-orange-55 bg-orange-50 border-orange-200 dark:bg-orange-950/35 dark:border-orange-900/50"
                              : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-200/40 dark:text-slate-505 dark:hover:text-slate-350 dark:hover:bg-slate-800/45"
                        )}
                        title="ছবি আপলোড করুন"
                     >
                        <Paperclip className="w-4 h-4 stroke-[2.5]" />
                     </button>

                     {/* Voice Dictation (Mic) */}
                     <button 
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 border relative",
                           isListening
                              ? "bg-red-500/10 border-red-300 text-red-500 dark:bg-red-950/30 dark:border-red-900/40 animate-pulse"
                              : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-200/40 dark:text-slate-505 dark:hover:text-slate-350 dark:hover:bg-slate-800/45"
                        )}
                        title={isListening ? "ভয়েস রেকর্ডি বন্ধ করুন" : "ভয়েস টাইপিং শুরু করুন"}
                     >
                        {isListening ? (
                           <>
                              <Mic className="w-4 h-4 text-red-500 stroke-[2.5]" />
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                           </>
                        ) : (
                           <Mic className="w-4 h-4 stroke-[2.5]" />
                        )}
                     </button>
                  </div>

                  {/* Dynamic Placeholder Textarea */}
                  <div className="flex-1 min-w-0 pr-2">
                     <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                           if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                           }
                        }}
                        placeholder={MODE_PLACEHOLDERS[mode]}
                        rows={1}
                        className="w-full resize-none bg-transparent outline-none focus:outline-none py-1 text-xs sm:text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500 max-h-[140px] leading-relaxed select-text text-slate-800 dark:text-slate-100"
                        style={{ border: "none", boxShadow: "none" }}
                     />
                  </div>

                  {/* Clear and counters panel inside console */}
                  <div className="flex items-center gap-1.5 pb-0.5 shrink-0 select-none">
                     {inputValue.length > 0 && (
                        <span className={cn("text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider transition-all",
                           inputValue.length >= 1300 
                              ? "bg-red-500/10 text-red-500 font-black" 
                              : inputValue.length >= 800 
                                 ? "bg-amber-500/15 text-amber-500"
                                 : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                        )}>
                           {inputValue.length}/1500
                        </span>
                     )}

                     {inputValue && (
                        <button
                           type="button"
                           onClick={() => {
                              setInputValue("");
                              if (textareaRef.current) {
                                 textareaRef.current.style.height = "auto";
                                 textareaRef.current.focus();
                              }
                           }}
                           className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                           title="লেখা মুছুন"
                        >
                           <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                     )}
                  </div>
               </div>

               {/* Outer circle send button */}
               <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isGenerating || (!inputValue.trim() && attachedFiles.length === 0)}
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 shadow-md hover:shadow-lg shrink-0 text-white",
                     (inputValue.trim() || attachedFiles.length > 0)
                        ? "bg-gradient-to-r from-orange-500 via-[#f97316] to-amber-500 hover:brightness-105 active:brightness-95 shadow-orange-500/10"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                  )}
                  title="বার্তা পাঠান"
               >
                  <Send className="w-4 h-4 stroke-[2.5]" />
               </button>
            </div>

            {/* Dynamic Firestore Synchrony Toasts */}
            <AnimatePresence>
               {firebaseToast && firebaseToast.visible && (
                  <motion.div 
                     initial={{ opacity: 0, y: 30, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 20, scale: 0.95 }}
                     className={cn(
                        "absolute bottom-24 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md max-w-[85%] text-xs font-black whitespace-nowrap",
                        firebaseToast.type === "success" 
                           ? "bg-slate-900/95 text-green-400 border-green-500/20" 
                           : firebaseToast.type === "error"
                              ? "bg-red-950/95 text-red-100 border-red-500/20"
                              : "bg-slate-900/95 text-orange-400 border-orange-500/20"
                     )}
                  >
                     {firebaseToast.type === "success" ? (
                        <Check className="w-3.5 h-3.5 stroke-[3] text-green-400 shrink-0" />
                     ) : firebaseToast.type === "error" ? (
                        <X className="w-3.5 h-3.5 stroke-[3] text-red-100 shrink-0 animate-bounce" />
                     ) : (
                        <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0 animate-pulse" />
                     )}
                     <span className="leading-tight truncate">{firebaseToast.message}</span>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* Micro action details */}
            <div className="flex items-center justify-between px-1.5 select-none opacity-60 text-[8px] sm:text-[9px] font-black tracking-wide text-slate-400 dark:text-slate-500 mt-2">
               <span className="flex items-center gap-1">
                  {isListening ? (
                     <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span className="text-red-550">তোমার কণ্ঠস্বর রেকর্ড হচ্ছে...</span>
                     </>
                  ) : (
                     "Developed by </RSF ROBIUL/>"
                  )}
               </span>
               <span className="hidden sm:inline">নতুন লাইনের জন্য SHIFT + ENTER চাপুন</span>
            </div>

               </div> {/* End of max-w-3xl container */}
            </div> {/* End of shrink-0 panel container */}
         </>
      ) : (
         /* ---------------- PAGE-BASED ADMIN & SETTINGS VIEW ---------------- */
         <div className="flex flex-col h-full w-full overflow-hidden select-none animate-fade-in bg-transparent">
            {/* Custom Admin Header */}
            <header className={cn("sticky top-0 left-0 right-0 h-[64px] min-h-[64px] shrink-0 border-b z-30 select-none flex items-center justify-between px-4 transition-all duration-300 shadow-sm backdrop-blur-md", 
               theme === "dark" ? "border-gray-800 bg-[#161e31]/95" : "border-gray-150 bg-white/95"
            )}>
               <div className="flex items-center gap-2">
                  <button 
                     type="button"
                     onClick={() => {
                        setCurrentView("chat");
                        if (soundEnabled) playSweetChime();
                     }}
                     className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm border",
                        theme === "dark" 
                           ? "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-gray-100 hover:border-slate-650" 
                           : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700 hover:border-gray-300"
                     )}
                     title="ফিরে যান"
                  >
                     <ArrowLeft className="w-4 h-4 text-[#f97316] stroke-[2.5]" />
                  </button>
                  <div className="flex flex-col">
                     <span className="text-xs font-black tracking-tight uppercase flex items-center gap-1.5 leading-tight">
                        <Cpu className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                        নিয়ন্ত্রণ প্যানেল
                     </span>
                     <span className="text-[8.5px] text-[#f97316] dark:text-orange-400 font-extrabold tracking-wide uppercase leading-tight">Humaira Admin Board</span>
                  </div>
               </div>

               {/* Right Side: Sync status icon with nice animation */}
               <div className="flex items-center gap-1.5">
                  <div className={cn("px-2 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase flex items-center gap-1 border transition-all shadow-xs",
                     saveStatus === "synced" 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : saveStatus === "saving" 
                           ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                           : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  )}>
                     {saveStatus === "synced" ? (
                        <>
                           <Check className="w-2.5 h-2.5 stroke-[3]" />
                           <span className="hidden xs:inline">Synced ☁️</span>
                        </>
                     ) : saveStatus === "saving" ? (
                        <>
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-0.5" />
                           <span>Saving ⏳</span>
                        </>
                     ) : (
                        <>
                           <Sparkles className="w-2.5 h-2.5 animate-pulse text-blue-500" />
                           <span className="hidden xs:inline">Local 💾</span>
                        </>
                     )}
                  </div>
               </div>
            </header>

            {/* Admin/Settings page tabbed scroll area */}
            <div className="flex-1 flex flex-col min-h-0 bg-transparent">
               
               {/* Tab Selector Segment */}
               <div className={cn("flex gap-1 p-2 shrink-0 border-b overflow-x-auto scrollbar-none", 
                  theme === "dark" ? "bg-[#111827]/40 border-gray-800" : "bg-[#f8fafc]/80 border-gray-150")}>
                  {[
                     { id: "profile", label: "👤 প্রোফাইল", icon: User },
                     { id: "persona", label: "🤖 পারসোনা", icon: Sparkles },
                     { id: "voice", label: "🔊 ভয়েস", icon: Volume2 },
                     { id: "analytics", label: "📊 এনালাইটিক্স", icon: BarChart2 },
                     { id: "backup", label: "📂 ডেটা", icon: RotateCcw }
                  ].map(tab => {
                     const Icon = tab.icon;
                     const active = activeSettingsTab === tab.id;
                     return (
                        <button
                           key={tab.id}
                           type="button"
                           onClick={() => {
                              setActiveSettingsTab(tab.id as any);
                              if (soundEnabled) playSweetChime();
                           }}
                           className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[9.5px] transition-all cursor-pointer shrink-0 border",
                              active
                                 ? "bg-gradient-to-r from-orange-500/15 via-[#f97316]/10 to-transparent text-[#f97316] border-[#f97316]/50 shadow-[0_1px_3px_rgba(249,115,22,0.05)]"
                                 : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-850"
                           )}
                        >
                           <Icon className="w-3.5 h-3.5 shrink-0" />
                           <span>{tab.label}</span>
                        </button>
                     );
                  })}
               </div>

               {/* Tab Panels Body Content */}
               <div className={cn("p-4 flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-4",
                  theme === "dark" ? "bg-[#0b0f19]/40" : "bg-white/40"
               )}>
                  
                  {activeSettingsTab === "profile" && (
                     <div className="flex flex-col gap-4 animate-fade-in">
                        {/* Avatar Profile Section */}
                        <div className="flex items-center gap-4 p-3 rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10">
                           <div className="relative group shrink-0 w-14 h-14 rounded-full border border-orange-200 dark:border-orange-850 flex items-center justify-center bg-orange-100/50 overflow-hidden font-black">
                              {userProfilePic ? (
                                 <img src={userProfilePic} className="w-full h-full object-cover" alt="Profile" />
                              ) : (
                                 <User className="w-6 h-6 text-[#f97316]" />
                              )}
                              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white font-black cursor-pointer transition-opacity">
                                 আপলোড
                                 <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                       const file = e.target.files?.[0];
                                       if (file) {
                                          if (file.size > 1 * 1024 * 1024) {
                                             showToast("ইমেজ সাইজ ১ মেগাবাইট বা কম হতে হবে!", "error");
                                             return;
                                          }
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                             const base64 = event.target?.result as string;
                                             if (base64) {
                                                handleUpdateProfileField("userProfilePic", base64);
                                             }
                                          };
                                          reader.readAsDataURL(file);
                                       }
                                    }} 
                                 />
                              </label>
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-0.5">প্রোফাইল পিকচার</h4>
                              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mb-1.5">আপনার সুন্দর প্রোফাইল অবতার আপলোড করুন।</p>
                              <div className="flex items-center gap-1.5">
                                 <label className="px-2.5 py-1 rounded-lg bg-[#f97316] text-white text-[9px] font-black cursor-pointer shadow-sm hover:brightness-105 active:scale-95 transition-all">
                                    আপলোড 📸
                                    <input 
                                       type="file" 
                                       accept="image/*" 
                                       className="hidden" 
                                       onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                             if (file.size > 1 * 1024 * 1024) {
                                                showToast("ইমেজ সাইজ ১ মেগাবাইট বা কম হতে হবে!", "error");
                                                return;
                                             }
                                             const reader = new FileReader();
                                             reader.onload = (event) => {
                                                const base64 = event.target?.result as string;
                                                if (base64) {
                                                   handleUpdateProfileField("userProfilePic", base64);
                                                }
                                             };
                                             reader.readAsDataURL(file);
                                          }
                                       }} 
                                    />
                                 </label>
                                 {userProfilePic && (
                                    <button 
                                       type="button"
                                       onClick={() => handleUpdateProfileField("userProfilePic", "")}
                                       className="px-2 py-1 rounded-lg border border-red-200 text-red-500 text-[9px] font-black hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                                    >
                                       মুছুন
                                    </button>
                                 )}
                              </div>
                           </div>
                        </div>

                        {/* Input User nickname */}
                        <div className="flex flex-col gap-1">
                           <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">আপনার ডাকনাম (User Nickname)</label>
                           <input 
                              type="text" 
                              value={userName} 
                              onChange={(e) => handleUpdateProfileField("userName", e.target.value)} 
                              className={cn("w-full rounded-xl p-2.5 font-bold text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all", theme === "dark" ? "bg-slate-900 border-slate-800 text-white placeholder-slate-655" : "bg-slate-50 border-slate-200 text-gray-800")}
                              placeholder="আপনার সুন্দর ডাকনাম লিখুন..."
                           />
                        </div>

                        {/* Dropdown: Love language */}
                        <div className="flex flex-col gap-1">
                           <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">ভালোবাসার ভাষা (Love Language)</label>
                           <select
                              value={loveLanguage}
                              onChange={(e) => handleUpdateProfileField("loveLanguage", e.target.value)}
                              className={cn("w-full rounded-xl p-2.5 font-bold text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all cursor-pointer", theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-gray-800")}
                           >
                              <option value="Words of Affirmation">💖 প্রশংসা ও মিষ্টি কথা (Words of Affirmation)</option>
                              <option value="Quality Time">⏱️ চমৎকার সময় কাটানো (Quality Time)</option>
                              <option value="Receiving Gifts">🎁 কিউট উপহার আদান-প্রধান (Receiving Gifts)</option>
                              <option value="Acts of Service">🤝 সাহায্যে হাত বাড়ানো (Acts of Service)</option>
                              <option value="Physical Touch">🤗 স্পর্শ ও জড়িয়ে ধরা (Physical Touch)</option>
                           </select>
                        </div>

                        {/* Datepicker: Anniversary Date */}
                        <div className="flex flex-col gap-1">
                           <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">পরিচয় বা অ্যানিভার্সারি ডেট (Anniversary Date)</label>
                           <input 
                              type="date" 
                              value={anniversaryDate} 
                              onChange={(e) => handleUpdateProfileField("anniversaryDate", e.target.value)} 
                              className={cn("w-full rounded-xl p-2.5 font-bold text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all cursor-pointer", theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-gray-800")}
                           />
                        </div>
                     </div>
                  )}

                  {activeSettingsTab === "persona" && (
                     <div className="flex flex-col gap-4 animate-fade-in">
                        {/* Chatbot Profile Name */}
                        <div className="flex flex-col gap-1">
                           <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">চ্যাটবটের নাম (AI Name)</label>
                           <input 
                              type="text" 
                              value={botName} 
                              onChange={(e) => {
                                 setBotName(e.target.value);
                                 localStorage.setItem("botName", e.target.value);
                                 syncProfile("botName", e.target.value);
                                 showToast("চ্যাটবটের নাম আপডেট করা হয়েছে! 🤖", "info");
                              }} 
                              className={cn("w-full rounded-xl p-2.5 font-bold text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all", theme === "dark" ? "bg-slate-900 border-slate-800 text-white placeholder-slate-655" : "bg-slate-50 border-slate-200 text-gray-800")}
                              placeholder="চ্যাটবটের কিউট নাম লিখুন..."
                           />
                        </div>

                        {/* AI Creativity Slider */}
                        <div className="flex flex-col gap-2 p-3 rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10">
                           <div className="flex items-center justify-between text-[9px] font-black text-gray-400 dark:text-gray-505 uppercase tracking-widest">
                              <span>এআই ক্রিয়েটিভিটি (Temperature)</span>
                              <span className="text-[#f97316] font-black">{aiCreativity.toFixed(1)}</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <Sliders className="w-4 h-4 text-gray-400" />
                              <input 
                                 type="range" 
                                 min="0.1" 
                                 max="1.5" 
                                 step="0.1"
                                 value={aiCreativity} 
                                 onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setAiCreativity(val);
                                    localStorage.setItem("aiCreativity", String(val));
                                 }} 
                                 className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#f97316]"
                              />
                           </div>
                           <div className="flex justify-between text-[8px] font-black text-gray-400 dark:text-gray-500 select-none">
                              <span>শান্ত (Strict)</span>
                              <span>ভারসাম্যপূর্ণ (1.0)</span>
                              <span>সৃজনশীল (Creative)</span>
                           </div>
                        </div>

                        {/* Prompt Customization Area */}
                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-gray-400 dark:text-gray-505 uppercase tracking-widest">মুড অনুযায়ী সিস্টেম প্রম্পট (System Prompts)</label>
                           
                           <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl border border-gray-150 dark:border-slate-800">
                              {(Object.keys(MODES) as Mode[]).map((mKey) => (
                                 <button
                                    key={mKey}
                                    type="button"
                                    onClick={() => {
                                       setEditPromptMode(mKey);
                                       if (soundEnabled) playSweetChime();
                                    }}
                                    className={cn(
                                       "px-2 py-1 text-[9px] font-black rounded-lg transition-all flex-1 text-center shrink-0 min-w-[50px] cursor-pointer",
                                       editPromptMode === mKey
                                          ? "bg-white dark:bg-slate-800 text-[#f97316] dark:text-white shadow-xs border border-gray-150 dark:border-slate-700"
                                          : "text-gray-550 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                    )}
                                 >
                                    {MODES[mKey].label.split(" ")[0]}
                                 </button>
                              ))}
                           </div>

                           <div className="relative mt-1">
                              <textarea
                                 rows={4}
                                 value={customPrompts[editPromptMode] || MODES[editPromptMode].prompt}
                                 onChange={(e) => handleUpdatePrompt(editPromptMode, e.target.value)}
                                 className={cn("w-full rounded-xl p-2.5 font-bold text-[10px] sm:text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all leading-relaxed", theme === "dark" ? "bg-slate-900 border-slate-800 text-gray-100 placeholder-slate-750" : "bg-slate-50 border-slate-200 text-gray-700")}
                              />
                              <button 
                                 onClick={() => {
                                    resetPromptToDefault(editPromptMode);
                                    if (soundEnabled) playSweetChime();
                                 }}
                                 type="button"
                                 className="absolute bottom-3 right-3 px-2 py-1 bg-red-500 hover:bg-red-600 rounded-lg text-white font-black transition-all shadow-md active:scale-95 flex items-center gap-1 text-[8px] cursor-pointer"
                                 title="ডিফল্ট প্রম্পটে রিসেট করুন"
                              >
                                 <RotateCcw className="w-2.5 h-2.5" />
                                 রিসেট
                              </button>
                           </div>
                           <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold leading-relaxed">
                              💡 হুমাইরা {MODES[editPromptMode].label} এ কীভাবে রোমান্টিক বা ফানি আচরণ করবে তা এই প্রম্পট দ্বারা প্রভাবিত হয়।
                           </p>
                        </div>
                     </div>
                  )}

                  {activeSettingsTab === "voice" && (
                     <div className="flex flex-col gap-4 animate-fade-in">
                        {/* Audio Toggle */}
                        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10">
                           <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-black text-gray-750 dark:text-gray-200">অ্যাপ সাউন্ড ইফেক্টস (Sound Effects)</span>
                              <span className="text-[9px] text-gray-450 dark:text-gray-500 font-bold">মিষ্টি কিউট সাউন্ড ফিডব্যাক ট্রিগার করবে</span>
                           </div>
                           <button 
                              onClick={() => {
                                 const next = !soundEnabled;
                                 setSoundEnabled(next);
                                 localStorage.setItem("soundEnabled", String(next));
                                 if (next) playSweetChime();
                              }}
                              type="button"
                              className={cn("w-10 h-5 rounded-full p-0.5 transition-colors relative duration-300 cursor-pointer", soundEnabled ? "bg-[#f97316]" : "bg-gray-300 dark:bg-gray-700")}
                           >
                              <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transform transition-all duration-300", soundEnabled ? "translate-x-5" : "translate-x-0")} />
                           </button>
                        </div>

                        {/* TTS speed slider */}
                        <div className="flex flex-col gap-2 p-3 rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10">
                           <div className="flex items-center justify-between text-[9px] font-black text-gray-400 dark:text-gray-505 uppercase tracking-widest font-bold">
                              <span>কথা বলার স্পিড বা গতি (TTS Speed)</span>
                              <span className="text-[#f97316] font-black">{ttsSpeed.toFixed(1)}x</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <Volume2 className="w-4 h-4 text-gray-400 shrink-0" />
                              <input 
                                 type="range" 
                                 min="0.5" 
                                 max="2.0" 
                                 step="0.1"
                                 value={ttsSpeed} 
                                 onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setTtsSpeed(val);
                                    localStorage.setItem("ttsSpeed", String(val));
                                 }} 
                                 className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#f97316]"
                              />
                           </div>
                           <div className="flex justify-between text-[8px] font-black text-gray-400 dark:text-gray-505 select-none">
                              <span>ধীর (Slow)</span>
                              <span>স্বাভাবিক (1.0x)</span>
                              <span>দ্রুত (Fast)</span>
                           </div>
                        </div>

                        {/* Hint box */}
                        <div className="p-3 bg-orange-50/30 dark:bg-orange-950/10 border border-orange-200/40 dark:border-orange-900/40 rounded-2xl">
                           <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                              🗣️ হুমাইরার মিষ্টি বাংলা ভয়েস আপনার লোকাল ব্রাউজারের বাংলা ইঞ্জিনের সাহায্যে শোনানো হয়। কথা বন্ধ করতে স্পিকার বাটনে আবারও ট্যাপ করুন।
                           </p>
                        </div>
                     </div>
                  )}

                  {activeSettingsTab === "analytics" && (
                     <div className="flex flex-col gap-4 animate-fade-in">
                        {/* Sentiment Analysis Heading block */}
                        <div className="p-3 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-[#f97316]/20 rounded-2xl">
                           <span className="text-[9px] font-black tracking-widest uppercase text-[#f97316]">📊 রিলেশনশিপ মুড এনালাইটিক্স</span>
                           <h4 className="text-xs font-black text-gray-800 dark:text-gray-100 mt-1">হুমাইরা বন্ড ট্র্যাকার ও অনুভূতি বিশ্লেষণ</h4>
                           <p className="text-[10px] text-[#f97316] font-bold mt-1 leading-relaxed">
                              💖 হুমাইরার সাথে আপনার সম্পর্কের স্থিতি: চমৎকার ও রোমান্টিক! অনুভূতিগুলো নিচে ট্র্যাক করা হলো।
                           </p>
                        </div>

                        {/* Recharts BarChart Visualization */}
                        <div className={cn("p-3 rounded-2xl border flex flex-col items-center justify-center h-[200px] w-full shadow-sm",
                           theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-gray-150"
                        )}>
                           <span className="text-[8.5px] font-black text-gray-400 dark:text-gray-505 mb-2 uppercase tracking-wider">কথোপকথনের অনুভূতি ডিস্ট্রিবিউশন</span>
                           <ResponsiveContainer width="100%" height="85%">
                              <BarChart data={analyzeSentiment()}>
                                 <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: "bold" }} stroke={theme === "dark" ? "#64748b" : "#94a3b8"} axisLine={false} tickLine={false} />
                                 <YAxis hide />
                                 <Tooltip 
                                    contentStyle={{ 
                                       backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff", 
                                       border: theme === "dark" ? "none" : "1px solid #e2e8f0", 
                                       borderRadius: "12px",
                                       fontSize: "10px",
                                       fontWeight: "bold"
                                    }} 
                                 />
                                 <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {analyzeSentiment().map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                 </Bar>
                              </BarChart>
                           </ResponsiveContainer>
                        </div>

                        {/* Stats Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2">
                           <div className="p-3 rounded-xl border border-gray-150 dark:border-gray-850 bg-gray-50/20 dark:bg-gray-900/10 text-center">
                              <span className="text-[8px] text-gray-405 dark:text-gray-500 uppercase font-black">মোট বার্তা সংখ্যা</span>
                              <p className="text-xs font-black text-orange-500 mt-0.5">{chats.reduce((total, chat) => total + chat.messages.length, 0)}</p>
                           </div>
                           <div className="p-3 rounded-xl border border-gray-150 dark:border-gray-850 bg-gray-50/20 dark:bg-gray-900/10 text-center">
                              <span className="text-[8px] text-gray-450 dark:text-gray-500 uppercase font-black">বর্তমান এআই এক্সপি (Chat XP)</span>
                              <p className="text-xs font-black text-amber-500 mt-0.5">⭐ {xp}</p>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSettingsTab === "backup" && (
                     <div className="flex flex-col gap-4 animate-fade-in">
                        {/* Info banner */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                           <h5 className="text-[11px] font-black text-blue-800 dark:text-blue-400 flex items-center gap-1">
                              <span>📂 ডেটা ব্যাকআপ ও স্মৃতি ব্যবস্থাপনা</span>
                           </h5>
                           <p className="text-[9.5px] text-blue-600 dark:text-blue-300 font-bold mt-1 leading-relaxed">
                              তথ্য ও চ্যাট সুরক্ষায় সংরক্ষিত ডেটা ডাউনলোড করুন অথবা ব্যাকআপ আপলোড করে হুমাইরার স্মৃতি ফিরিয়ে নিয়ে আসুন।
                           </p>
                        </div>

                        {/* Action details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                           {/* Export */}
                           <div className="p-3 rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10 flex flex-col justify-between">
                              <div>
                                 <h4 className="text-[11px] font-black text-gray-750 dark:text-gray-200">এক্সপোর্ট চ্যাট 📤</h4>
                                 <p className="text-[8.5px] text-gray-450 dark:text-gray-500 font-bold leading-relaxed mt-1">সব চ্যাট ফাইল রূপে রিকভারির জন্য ডাউনলোড করুন।</p>
                              </div>
                              <button
                                 type="button"
                                 onClick={handleExportChats}
                                 className="w-full mt-3 py-1.5 text-[10px] font-black text-white bg-[#f97316] hover:brightness-105 active:scale-95 rounded-lg transition-all cursor-pointer min-h-[28px]"
                              >
                                 ডাউনলোড করুন
                              </button>
                           </div>

                           {/* Import */}
                           <div className="p-3 rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10 flex flex-col justify-between">
                              <div>
                                 <h4 className="text-[11px] font-black text-gray-750 dark:text-gray-200">ইম্পোর্ট ব্যাকআপ 📥</h4>
                                 <p className="text-[8.5px] text-gray-450 dark:text-gray-500 font-bold leading-relaxed mt-1">পূর্বে সেভ করা চ্যাট ব্যাকআপ আপলোড করুন।</p>
                              </div>
                              <label className="w-full mt-3 py-1.5 text-[10px] font-black text-[#f97316] dark:text-orange-400 bg-gray-100 dark:bg-slate-800 text-center hover:bg-gray-200 dark:hover:bg-slate-750 active:scale-95 rounded-lg transition-all border border-dashed border-gray-200 dark:border-slate-700 block cursor-pointer">
                                 ফাইল আপলোড করুন 📁
                                 <input 
                                    type="file" 
                                    accept=".json" 
                                    className="hidden" 
                                    onChange={handleImportChats}
                                 />
                              </label>
                           </div>
                        </div>

                        {/* Separation line */}
                        <div className="h-[0.5px] w-full bg-gray-200 dark:bg-gray-800" />

                        {/* Danger zone */}
                        <div className="p-3 bg-red-500/5 rounded-2xl border border-red-500/15 flex flex-col gap-1.5">
                           <span className="text-[8.5px] font-black text-red-500 uppercase tracking-widest">বিপজ্জনক এলাকা (Danger Zone)</span>
                           <p className="text-[9.5px] text-gray-400 dark:text-gray-500 font-bold leading-relaxed">
                              সমস্ত স্মৃতি বা চ্যাট হিস্ট্রি চিরতরে মুছে প্রস্থান করুন। এটি কোনোভাবেই ফিরিয়ে আনা সম্ভব না।
                           </p>
                           <button 
                              onClick={() => {
                                 if (confirm("আপনি কি নিশ্চিতভাবে সব চ্যাট ডিলিট করতে চান? এটি আর ফিরিয়ে আনা সম্ভব নয়।")) {
                                    setChats([]);
                                    setActiveChatId(null);
                                    setCurrentView("chat");
                                    if (soundEnabled) playSweetChime();
                                 }
                              }}
                              type="button"
                              className="w-full py-1.5 rounded-lg border border-red-200/50 hover:bg-red-500 hover:text-white text-red-500 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                           >
                              🗑️ সমস্ত স্মৃতি মুছে ফেলুন
                           </button>
                        </div>
                     </div>
                  )}

               </div>

               {/* Admin Footer bar */}
               <div className={cn("p-3 border-t flex justify-between items-center shrink-0",
                  theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-[#fcfdfe] border-gray-150"
               )}>
                  <span className="text-[8px] font-black tracking-widest text-[#f97316] uppercase animate-pulse">
                     ● HUMAIRA CORE INTEL
                  </span>
                  <button 
                     type="button"
                     onClick={() => {
                        setCurrentView("chat");
                        if (soundEnabled) playSweetChime();
                     }}
                     className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-[#f97316] hover:brightness-105 active:scale-95 text-white font-extrabold text-[10px] transition-all shadow-md cursor-pointer flex items-center gap-1 rounded-xl"
                  >
                     <span>সংরক্ষণ ও বন্ধ করুন</span>
                     <Check className="w-3 h-3 stroke-[2.5]" />
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Drawer Overlay */}
      <AnimatePresence>
         {isSidebarOpen && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               transition={{ duration: 0.2 }}
               className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" 
               onClick={() => setIsSidebarOpen(false)} 
            />
         )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <AnimatePresence>
         {isSidebarOpen && (
            <motion.div 
               initial={{ x: "-100%" }} 
               animate={{ x: 0 }} 
               exit={{ x: "-100%" }} 
               transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
               className={cn("fixed top-0 left-0 bottom-0 w-[290px] sm:w-[330px] z-50 flex flex-col shadow-2xl transition-all duration-300", 
                  theme === 'dark' ? "bg-slate-950 border-r border-slate-800 text-slate-100" : "bg-white border-r border-slate-150 text-slate-900"
               )}
            >
               {/* Sidebar Header */}
               <div className={cn("p-4 border-b flex items-center justify-between select-none", 
                  theme === 'dark' ? "border-slate-800 bg-[#111c2e]/40" : "border-slate-100 bg-slate-50"
               )}>
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full border-2 border-[#f97316] overflow-hidden bg-orange-100 p-0.5 shadow-sm">
                           <img src={humairaAvatar} alt="Humaira" className="w-full h-full object-cover rounded-full" />
                       </div>
                       <div className="flex flex-col">
                           <span className="font-extrabold text-sm tracking-tight flex items-center gap-1">হুমায়রা এআই <span className="text-xs">💖</span></span>
                           <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">তোমার ভার্চুয়াল রিয়েল সঙ্গী</span>
                       </div>
                   </div>
                   <button 
                       onClick={() => setIsSidebarOpen(false)}
                       className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                       title="বন্ধ করুন"
                   >
                       <X className="w-4 h-4" />
                   </button>
               </div>
               
               {/* New Chat Button */}
               <div className="p-3">
                  <button 
                     onClick={() => { createNewChat(); setIsSidebarOpen(false); }} 
                     className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-[#f97316] dark:hover:bg-orange-600 text-white flex items-center justify-center gap-2 font-black text-xs transition-all duration-200 active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer min-h-[38px] select-none"
                  >
                     <Plus className="w-4 h-4 stroke-[3]" /> নতুন চ্যাট শুরু করুন
                  </button>
               </div>

               {/* Sidebar Scrollable Sections */}
               <div className="flex-1 overflow-y-auto w-full px-3 py-1 space-y-4">
                   {/* Roast Modes */}
                   <div>
                       <h3 className="px-2 text-[9px] font-extrabold text-orange-500 dark:text-orange-400 tracking-widest uppercase mb-1.5 select-none">
                           হুমায়রার মুডসমূহ
                       </h3>
                       <div className="flex flex-col gap-0.5">
                           {(["NORMAL", "ROMANTIC", "FUN"] as Mode[]).map(m => {
                               const isActive = mode === m;
                               let activeClasses = "";
                               if (m === "ROMANTIC") {
                                   activeClasses = "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/35 dark:text-rose-400";
                               } else {
                                   activeClasses = "bg-orange-50 border-orange-100 text-[#f97316] dark:bg-orange-950/20 dark:border-orange-900/35 dark:text-orange-300";
                               }
                               const Icon = MODES[m].icon;
                               return (
                                   <button 
                                       key={m} 
                                       onClick={() => { setMode(m); setIsSidebarOpen(false); if (soundEnabled) playSweetChime(); }} 
                                       className={cn(
                                           "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-between w-full text-left transition-all duration-150 border cursor-pointer hover:translate-x-0.5",
                                           isActive 
                                               ? activeClasses 
                                               : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-[#111c2e]/10 dark:hover:bg-slate-800/60"
                                       )}
                                   >
                                       <div className="flex items-center gap-2">
                                           <Icon className={cn("w-3.5 h-3.5", isActive ? "" : "text-slate-400")} />
                                           <span>{MODES[m].label}</span>
                                       </div>
                                       {isActive && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                   </button>
                               );
                           })}
                       </div>
                   </div>

                   {/* Pro modes */}
                   <div>
                       <h3 className="px-2 text-[9px] font-extrabold text-purple-600 dark:text-purple-400 tracking-widest uppercase mb-1.5 select-none">
                           টুলস ও ভিআইপি মোডসমূহ
                       </h3>
                       <div className="flex flex-col gap-0.5">
                           {(["ISLAMIC", "LEGEND"] as Mode[]).map(m => {
                               const isActive = mode === m;
                               const Icon = MODES[m].icon;
                               return (
                                   <button 
                                       key={m} 
                                       onClick={() => { setMode(m); setIsSidebarOpen(false); if (soundEnabled) playSweetChime(); }} 
                                       className={cn(
                                           "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-3 w-full text-left transition-all duration-150 border cursor-pointer hover:translate-x-0.5",
                                           isActive 
                                               ? "bg-purple-50 border-purple-150 text-purple-600 dark:bg-purple-950/20 dark:border-purple-900/40 dark:text-purple-300" 
                                               : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-[#111c2e]/10 dark:hover:bg-slate-800/60"
                                       )}
                                   >
                                       <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 shadow-sm", 
                                           isActive ? "bg-purple-600" : "bg-purple-450 dark:bg-purple-500"
                                       )}>
                                           <Icon className="w-3 h-3" />
                                       </div>
                                       <span className="flex-1">{MODES[m].label}</span>
                                       <span className="bg-amber-100/90 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/30">PRO</span>
                                   </button>
                               );
                           })}
                       </div>
                   </div>
                   
                   {/* Recents */}
                   <div>
                       <h3 className="px-2 text-[9px] font-extrabold text-slate-500 dark:text-slate-400 tracking-widest uppercase mb-1.5 select-none">
                           সাম্প্রতিক চ্যাটসমূহ ⏳
                       </h3>
                       <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto scrollbar-none pr-0.5">
                           {chats.length === 0 ? (
                               <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic select-none">কোনো চ্যাট ডায়েরি নেই</div>
                           ) : (
                               chats.map(chat => {
                                   const isActive = activeChatId === chat.id;
                                   return (
                                       <div 
                                           key={chat.id} 
                                           className={cn(
                                               "group flex items-center justify-between w-full rounded-lg transition-all border pl-1 pr-1.5 py-0.5 select-none hover:translate-x-0.5", 
                                               isActive
                                                   ? "bg-orange-50/50 border-orange-100 dark:bg-orange-950/15 dark:border-orange-500/20 text-orange-600 dark:text-orange-400"
                                                   : "bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-[#111c2e]/10 dark:hover:bg-slate-800/40"
                                           )}
                                       >
                                           <button 
                                               onClick={() => { setActiveChatId(chat.id); setIsSidebarOpen(false); if (soundEnabled) playSweetChime(); }} 
                                               className="px-2 py-1 flex-1 font-semibold text-xs text-left truncate cursor-pointer"
                                               title={chat.title}
                                           >
                                               💬 {chat.title}
                                           </button>
                                           <button 
                                               onClick={(e) => { deleteChat(chat.id, e); }} 
                                               className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-400 dark:text-slate-500 transition-all cursor-pointer"
                                               title="মুছে ফেলুন"
                                           >
                                               <Trash2 className="w-3 h-3" />
                                           </button>
                                       </div>
                                   );
                               })
                           )}
                       </div>
                   </div>
               </div>

               {/* Profile Area bottom: compact, beautifully styled inside a card with no extra empty space */}
               <div className={cn("p-3 border-t shrink-0 select-none", 
                  theme === 'dark' ? "border-slate-800/80 bg-slate-900/40" : "border-slate-100 bg-slate-50/50"
               )}>
                  <div className="flex flex-col gap-2">
                     {/* User credentials / account card */}
                     <div className={cn("rounded-xl p-2 flex items-center gap-2.5 border transition-all", 
                        theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                     )}>
                        {firebaseUser ? (
                           <>
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 border-2 border-orange-400 p-0.5 shadow-xs shrink-0 relative">
                                 {userProfilePic ? (
                                    <img src={userProfilePic} className="w-full h-full object-cover rounded-full" alt="Profile" />
                                 ) : (
                                    <User className="w-full h-full p-1 text-orange-500" />
                                 )}
                                 <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-slate-900 rounded-full" />
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                 <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5 leading-none">
                                    {userName}
                                    <span className="text-[7.5px] bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 px-1 py-0.2 rounded-full font-black scale-90 origin-left border border-green-200/50 dark:border-green-800/30 uppercase">ONLINE</span>
                                 </span>
                                 <span className="font-medium text-[8.5px] text-slate-400 dark:text-slate-500 truncate tracking-tight">{firebaseUser.email}</span>
                              </div>
                           </>
                        ) : (
                           <button 
                              onClick={() => { handleLogin(); setIsSidebarOpen(false); }} 
                              className="flex items-center gap-2.5 w-full text-left group cursor-pointer"
                           >
                              <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 flex items-center justify-center shrink-0">
                                 <User className="w-3.5 h-3.5 text-orange-500" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                 <span className="font-extrabold text-xs text-orange-555 group-hover:text-orange-600 transition-colors leading-tight">আইডিতে সাইন-ইন করুন 🔑</span>
                                 <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-semibold leading-tight">তথ্য ও চ্যাট সুরক্ষায় গুগল লগইন</span>
                              </div>
                           </button>
                        )}
                     </div>

                     {/* Settings Button */}
                     <button 
                        onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); if (soundEnabled) playSweetChime(); }} 
                        className="w-full py-1.5 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-gradient-to-r from-orange-500/10 to-orange-500/5 dark:from-orange-950/25 dark:to-orange-950/15 flex items-center justify-center gap-2 font-black text-xs text-[#f97316] dark:text-orange-400 hover:brightness-105 active:scale-98 shadow-xs transition-all cursor-pointer min-h-[34px]"
                     >
                        <Settings className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 animate-spin-slow" />
                        এআই পারসোনা ও সেটিংস ⚙️
                     </button>

                     {/* Bottom Controls Row */}
                     <div className="flex items-center gap-1.5">
                        <button 
                           onClick={() => { setTheme(theme === "light" ? "dark" : "light"); if (soundEnabled) playSweetChime(); }} 
                           className={cn("flex-1 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[34px]",
                              theme === "light" 
                                 ? "border-slate-200 bg-white text-slate-705 hover:bg-slate-50 hover:border-slate-300" 
                                 : "border-slate-800 bg-slate-800/80 text-slate-200 hover:bg-slate-750 hover:border-slate-700"
                           )}
                        >
                           {theme === "light" ? <Moon className="w-3.5 h-3.5 text-indigo-500"/> : <Sun className="w-3.5 h-3.5 text-amber-500"/>}
                           {theme === "light" ? "ডার্ক মোড" : "লাইট মোড"}
                        </button>
                        {firebaseUser && (
                           <button 
                              onClick={() => { handleLogout(); setIsSidebarOpen(false); if (soundEnabled) playSweetChime(); }} 
                              className={cn("flex-1 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[34px]",
                                 theme === "light"
                                    ? "border-red-105 bg-red-50/50 text-red-600 hover:bg-red-50 hover:border-red-200"
                                    : "border-red-950 bg-red-950/10 text-red-400 hover:bg-red-950/20 hover:border-red-900"
                              )}
                           >
                              <LogOut className="w-3.5 h-3.5"/>
                              লগআউট
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <style>
        {`
        .markdown-content { color: #1e293b; }
        .dark .markdown-content { color: #f1f5f9; }
        .markdown-content p, 
        .markdown-content span, 
        .markdown-content li, 
        .markdown-content strong, 
        .markdown-content table, 
        .markdown-content td, 
        .markdown-content th { 
          color: inherit !important; 
        }
        .markdown-content h1, 
        .markdown-content h2, 
        .markdown-content h3, 
        .markdown-content h4, 
        .markdown-content h5, 
        .markdown-content h6 {
          color: inherit !important; 
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .markdown-content p { margin-bottom: 0.75rem; font-weight: 500; line-height: 1.6; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content strong { font-weight: 800; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 4px; }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .shimmer-bg {
          position: relative;
          overflow: hidden;
        }
        .shimmer-bg::after {
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 20%,
            rgba(255, 255, 255, 0.5) 60%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 1.6s infinite ease-in-out;
          content: '';
        }
        .dark .shimmer-bg::after {
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.08) 20%,
            rgba(255, 255, 255, 0.15) 60%,
            rgba(255, 255, 255, 0) 100%
          );
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }
        `}
      </style>

      {/* Full-Screen Image Lightbox View Overlay */}
      <AnimatePresence>
         {selectedLightboxImage && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-zoom-out"
               onClick={() => setSelectedLightboxImage(null)}
            >
               <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="relative max-w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
               >
                  <img 
                     src={selectedLightboxImage} 
                     alt="Lightbox" 
                     className="max-w-full max-h-[80vh] object-contain rounded-xl select-none" 
                  />
                  <button
                     onClick={() => setSelectedLightboxImage(null)}
                     className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/95 rounded-full text-white cursor-pointer transition-colors"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
      </div>
    </div>
  );
}
