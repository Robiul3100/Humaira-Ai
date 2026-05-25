
import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Menu, Star, Plus, Heart, Flame, Smile, Trophy, MessageCircle, Moon, Anchor, Sun, LogOut, Mic, Layout, User, Send, Check, Shield, Settings, Sliders, RotateCcw, Paperclip, Image, X, Trash2, Copy, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { marked } from "marked";
import DOMPurify from "dompurify";
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
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
  const [userRole, setUserRole] = useState<"user"|"admin">("user");
  const [userName, setUserName] = useState("Ayan");
  const [userProfilePic, setUserProfilePic] = useState("");
  const [aiAvatarSeed, setAiAvatarSeed] = useState(() => {
    return localStorage.getItem("aiAvatarSeed") || "Humaira";
  });
  const [xp, setXp] = useState(1250);
  const [loveLanguage, setLoveLanguage] = useState("Words of Affirmation");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [streak, setStreak] = useState(1);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Settings Panel States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
      return updated;
    });
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
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            return;
          }
          if (userDoc && userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || "user");
            setUserName(data.name || user.displayName || "Ayan");
            setUserProfilePic(data.photoURL || user.photoURL || "");
            if (data.aiAvatarSeed) {
              setAiAvatarSeed(data.aiAvatarSeed);
              localStorage.setItem("aiAvatarSeed", data.aiAvatarSeed);
            }
            setXp(data.xp || 1250);
            setLoveLanguage(data.loveLanguage || "Words of Affirmation");
            setAnniversaryDate(data.anniversaryDate || "");
            setStreak(data.streak || 1);
            setAchievements(data.achievements || []);
          } else {
            const isAdmin = user.email === 'hmrobiulislam75@gmail.com' && user.emailVerified;
            const newRole = isAdmin ? "admin" : "user";
            try {
              await setDoc(doc(db, "users", user.uid), {
                role: newRole,
                name: user.displayName || "Ayan",
                email: user.email,
                photoURL: user.photoURL,
                xp: 1250,
                loveLanguage: "Words of Affirmation",
                anniversaryDate: "",
                streak: 1,
                achievements: [],
                aiAvatarSeed: "Humaira"
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
            }
            setUserRole(newRole);
            setUserName(user.displayName || "Ayan");
            setUserProfilePic(user.photoURL || "");
          }
        } catch (e) { console.error(e); }
      }
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

  const syncProfile = async (field: string, value: any) => {
    if (!firebaseUser) return;
    try { 
      await updateDoc(doc(db, "users", firebaseUser.uid), { [field]: value }); 
    } catch (e) {
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
      handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser.uid}/chats/${chat.id}`);
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
         handleFirestoreError(error, OperationType.DELETE, `users/${firebaseUser.uid}/chats/${id}`);
       }
     }
     if(activeChatId === id) setActiveChatId(null);
  };

  const handleSendMessage = async (customText?: string) => {
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
      if (botName && botName !== "হুমায়রা এআই") {
         sysInstruction = sysInstruction.replace(/Humaira/g, botName).replace(/হুমায়রা/g, botName);
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

  const renderInputForm = (isCentered: boolean) => {
     const t = MODE_THEMES[mode];
     return (
         <form 
           onSubmit={e => { e.preventDefault(); handleSendMessage(); }} 
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}
           className={cn("flex flex-col gap-1 rounded-[24px] border transition-all duration-300 relative w-full", 
              isDragging
                ? "border-dashed border-2 border-orange-500 bg-orange-500/10 dark:bg-orange-500/5 animate-pulse"
                : (theme === "dark" 
                   ? cn("border-gray-800 focus-within:border-[#f97316]/80 focus-within:ring-2 focus-within:ring-[#f97316]/10", 
                        isCentered ? "shadow-xl bg-gray-900/90" : "shadow-xl bg-gray-950/80 backdrop-blur-md"
                     ) 
                   : cn("border-gray-200 focus-within:border-[#f97316]/80 focus-within:ring-2 focus-within:ring-[#f97316]/5", 
                        isCentered ? "shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white" : "shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white/95 backdrop-blur-md"
                     )),
              activeChat ? "" : "border-orange-500/40"
           )}
           style={{ 
             padding: '8px',
             borderColor: isModeSelectorOpen ? t.accent : undefined,
             boxShadow: isModeSelectorOpen ? `0 0 15px ${t.accent}20` : undefined
           }}
         >
           {/* Hidden File Input for Image Attachments */}
           <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              multiple 
              accept="image/*" 
              className="hidden" 
           />

           {/* Dynamic Image Attachment Preview Row */}
           {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800/40">
                 <AnimatePresence>
                    {attachedFiles.map((file, idx) => (
                       <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          key={idx}
                          className="relative w-11 h-11 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group shadow-sm shrink-0"
                       >
                          <img src={file} alt="Attached Preview" className="w-full h-full object-cover" />
                          <button
                             type="button"
                             onClick={() => removeAttachedFile(idx)}
                             className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
                          >
                             <X className="w-3.5 h-3.5" />
                          </button>
                       </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
           )}

           <textarea
              style={{ color: theme === "dark" ? "#f3f4f6" : "inherit" }}
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyDown={(e) => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder={isCentered ? "কাউকে প্রেম নিবেদন করো বা কিছু জিজ্ঞেস করো..." : "কিছু জিজ্ঞেস করো..."}
              rows={1}
              className="resize-none outline-none w-full bg-transparent px-3 py-2 text-gray-800 dark:text-gray-100 font-medium placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed max-h-[120px] text-[15px] sm:text-base border-0 focus:ring-0 focus:outline-none"
           />
           
           <div className="flex items-center justify-between w-full pt-2 pb-1 px-2 border-t border-gray-100 dark:border-gray-800/50">
              <div className="relative">
                  <button 
                     type="button"
                     onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)}
                     className={cn(
                        "text-[10px] sm:text-xs uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-full leading-none flex items-center gap-1.5 shadow-sm select-none transition-all active:scale-95 border shrink-0 flex-nowrap max-w-[145px] sm:max-w-none",
                        theme === "dark" 
                          ? `${t.bgDark} ${t.borderDark} ${t.textDark} hover:bg-gray-800` 
                          : `${t.bgLight} ${t.borderLight} ${t.text} hover:bg-gray-100`
                     )}
                  >
                     {React.createElement(MODES[mode].icon, { className: "w-3.5 h-3.5 shrink-0" })}
                     <span className="truncate max-w-[90px] sm:max-w-none">{MODES[mode].label}</span>
                     <span className="text-[9px] opacity-60 shrink-0">▼</span>
                  </button>
                  
                  {isModeSelectorOpen && (
                    <>
                      {/* Overlay to close popover */}
                      <div className="fixed inset-0 z-30 pointer-events-auto" onClick={() => setIsModeSelectorOpen(false)} />
                      <div className={cn(
                        "absolute bottom-full mb-2 left-0 z-40 w-[220px] max-h-[250px] overflow-y-auto rounded-2xl border shadow-xl p-2 flex flex-col gap-1 pointer-events-auto scrollbar-thin",
                        theme === "dark" ? "bg-gray-900 border-gray-800 text-gray-200" : "bg-white border-gray-100 text-gray-800"
                      )}>
                        {Object.keys(MODES).map((k) => {
                          const mKey = k as Mode;
                          const mData = MODES[mKey];
                          const MIcon = mData.icon;
                          const itemT = MODE_THEMES[mKey];
                          return (
                            <button
                              key={mKey}
                              type="button"
                              onClick={() => {
                                setMode(mKey);
                                setIsModeSelectorOpen(false);
                              }}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors w-full",
                                mode === mKey
                                  ? theme === "dark" ? `${itemT.bgDark} ${itemT.textDark}` : `${itemT.bgLight} ${itemT.text}`
                                  : theme === "dark" ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                              )}
                            >
                              <MIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{mData.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
              </div>
              
              <div className="flex items-center gap-2">
                 {/* Attachment Clickable Trigger Icon */}
                 <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="ছবি আপলোড করুন"
                    className={cn(
                       "p-2 rounded-full transition-colors active:scale-95 flex items-center justify-center cursor-pointer min-w-[38px] min-h-[38px]",
                       attachedFiles.length > 0
                          ? "text-orange-500 bg-orange-100/30 dark:bg-orange-950/20"
                          : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                 >
                    <Paperclip className="w-4 h-4" />
                 </button>

                 {/* Character Limitation Meter Counter */}
                 {inputValue.length > 800 && (
                    <span 
                       className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded leading-none transition-all select-none",
                          inputValue.length >= 1300
                             ? "text-red-500 bg-red-100/30 dark:bg-red-950/20"
                             : "text-amber-500 bg-amber-100/30 dark:bg-amber-950/20"
                       )}
                    >
                       {inputValue.length} / 1500
                    </span>
                 )}

                 {(inputValue.trim() || attachedFiles.length > 0) ? (
                    <button type="submit" className={cn("p-2 text-white hover:brightness-105 active:scale-95 rounded-full transition-all shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer min-w-[38px] min-h-[38px] bg-gradient-to-r", t.buttonBg)} disabled={isGenerating}>
                        <Send className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                 ) : (
                    <button 
                       type="button" 
                       onClick={toggleSpeechRecognition}
                       className={cn(
                          "p-2 rounded-full transition-all min-w-[38px] min-h-[38px] flex items-center justify-center relative",
                          isListening 
                             ? "text-white bg-red-500 shadow-lg shadow-red-500/40 animate-pulse" 
                             : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                       )}
                    >
                        {isListening && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                          </span>
                        )}
                        <Mic className={cn("w-4 h-4", isListening && "scale-110")} />
                    </button>
                 )}
              </div>
            </div>
         </form>
     );
  };

  const currentModeData = MODES[mode];

  return (
    <div className={cn("flex items-center justify-center min-h-screen transition-colors duration-300 p-0 sm:p-2 md:p-4 w-full max-w-full overflow-x-hidden", theme === "dark" ? "bg-[#0c0f18]" : "bg-[#E6EAF2]")}>
      <div className={cn("flex flex-col h-screen w-full sm:max-w-[390px] sm:h-[830px] sm:rounded-[36px] sm:border-[8px] sm:border-gray-800 sm:shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden transition-all w-full max-w-full sm:w-[390px]", 
         theme === "dark" ? "bg-[#0b0f19] text-gray-100" : "bg-[#F5F6FA] text-gray-950"
      )}>
      
      {/* Header */}
      <header className={cn("flex items-center justify-between px-4 py-3 shrink-0 border-b shadow-sm z-10", theme === "dark" ? "border-gray-800 bg-[#161e31]" : "border-gray-100 bg-white")}>
          <div className="flex items-center gap-2">
              {activeChatId ? (
                <button 
                  onClick={() => setActiveChatId(null)}
                  className="p-1 px-2.5 -ml-1.5 rounded-xl border border-gray-200 dark:border-gray-755 bg-gray-50/50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold active:bg-gray-100 dark:active:bg-gray-700 transition-all shadow-sm select-none"
                >
                  ◀ ফিরুন
                </button>
              ) : (
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                   <Menu className="w-5 h-5" />
                </button>
              )}
              {activeChatId && (
                <motion.div 
                  className="w-7 h-7 rounded-full border-[2px] overflow-hidden flex items-center justify-center p-0.5 bg-amber-50 cursor-pointer shadow-sm relative shrink-0"
                  style={{ borderColor: MODE_THEMES[mode].accent }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  onClick={() => setIsProfileModalOpen(true)}
                >
                  <img src={humairaAvatar} alt="Humaira" className="w-full h-full rounded-full object-cover" />
                </motion.div>
              )}
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight select-none transition-colors duration-300" style={{ color: MODE_THEMES[mode].accent }}>
                {botName} ✨
              </h1>
          </div>
          <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-orange-200 text-[#f97316] bg-orange-50 font-bold text-xs tracking-tight transition-all active:scale-95">
                 <span className="text-orange-500">✦</span> প্রো 👑
              </button>
              <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center">
                 {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
              </button>
          </div>
      </header>

      {/* Main Content Area */}
      <main ref={scrollRef} className="flex-1 relative overflow-y-auto flex flex-col items-center w-full">
         {(!activeChat || activeChat.messages.length === 0) ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 max-w-2xl mx-auto py-8">
                {/* Greeting Avatar with glowing dynamic pulse */}
                <motion.div 
                  className="relative mb-6 group cursor-pointer"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  onClick={() => setIsProfileModalOpen(true)}
                >
                    <div 
                      className="absolute inset-0 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" 
                      style={{ background: `radial-gradient(circle, ${MODE_THEMES[mode].accent} 0%, transparent 70%)` }}
                    />
                    <div 
                      className="relative w-[130px] h-[130px] rounded-full border-[6px] p-1.5 overflow-hidden bg-white dark:bg-gray-950 shadow-2xl transition-transform duration-500 group-hover:scale-105"
                      style={{ borderColor: MODE_THEMES[mode].accent }}
                    >
                       <img src={humairaAvatar} alt="Humaira AI" className="w-full h-full object-cover rounded-full bg-amber-50" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white dark:border-[#0b0f19]" />
                </motion.div>

                <div className="text-center space-y-2 mb-8">
                    <h2 className={cn("text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r", MODE_THEMES[mode].gradient)}>
                        Humaira AI
                    </h2>
                    <p className="text-sm md:text-base font-bold text-gray-500 dark:text-gray-400 max-w-md mx-auto line-clamp-2">
                        তোমার আবেগপূর্ণ এবং মিষ্টি AI সঙ্গী। তুমি যা জানতে চাও নির্দ্বিধায় জিজ্ঞেস করো! ❤️
                    </p>
                </div>

                {/* Centered Modern Input Form */}
                <div className="w-full">
                    {renderInputForm(true)}
                </div>

                {/* Clean, dynamic prompt suggestions like Gemini */}
                <div className="grid grid-cols-2 gap-3 w-full mt-8 max-w-xl">
                   {[
                      { text: "মিষ্টি প্রেমের কবিতা লেখো ✍️", prompt: "আমার জন্য একটি মিষ্টি প্রেমের কবিতা লেখো।" },
                      { text: "মুড অফ থাকলে কি করব? 🌸", prompt: "হুমায়রা, আমার মুড অফ। মন ভালো করার কিছু মিষ্টি উপায় বলো তো।" },
                      { text: "প্রথম ডেটের চমৎকার আইডিয়া 💫", prompt: "আমাদের প্রথম ডেট কেমন হওয়া উচিত? একটি সুন্দর প্ল্যান দাও।" },
                      { text: "আজকের স্পেশাল রেসিপি বলো 🥯", prompt: "আজকে চমৎকার কোনো মিষ্টি বা স্পেশাল ডিশ তৈরির রেসিপি বলো।" }
                   ].map((item, idx) => (
                      <motion.button
                         key={idx}
                         whileHover={{ scale: 1.02, y: -2 }}
                         whileTap={{ scale: 0.98 }}
                         onClick={() => {
                            setInputValue(item.prompt);
                            if (textareaRef.current) {
                               textareaRef.current.focus();
                            }
                         }}
                         type="button"
                         className={cn(
                            "p-3.5 text-left rounded-3xl text-xs sm:text-sm font-bold transition-all border shadow-sm flex flex-col justify-between items-start h-24 hover:shadow-md cursor-pointer",
                            theme === "dark" 
                               ? "bg-gray-900/60 border-gray-800/85 hover:border-orange-500/30 text-gray-200" 
                               : "bg-white border-gray-100/90 hover:border-orange-500/20 text-gray-700"
                         )}
                      >
                         <span className="line-clamp-2 leading-relaxed">{item.text}</span>
                         <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">✦ Humaira AI</span>
                      </motion.button>
                   ))}
                </div>

                <div className="mt-10 text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                   RSF ROBIUL দ্বারা ডেভেলপ করা Humaira AI চ্যাটবট
                </div>
            </div>
         ) : (
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 p-4 pb-28">
               {activeChat.messages.map(m => {
                  if (m.role === "assistant" && m.content === "" && isGenerating) {
                     return null; // Skip rendering empty thinking assistant message
                  }
                  return (
                     <div 
                        key={m.id} 
                        className={cn(
                           "flex w-full gap-3 sm:gap-4 items-start animate-fade-in", 
                           m.role === "user" ? "justify-end" : "justify-start"
                        )}
                     >
                        {/* LEFT SIDE: Assistant Profile Picture */}
                        {m.role === "assistant" && (
                           <motion.div 
                             className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] rounded-full border overflow-hidden flex items-center justify-center p-0.5 bg-amber-50 dark:bg-amber-950/20 shadow-md shrink-0 self-start transition-all"
                             style={{ borderColor: MODE_THEMES[mode].accent }}
                             whileHover={{ scale: 1.05 }}
                           >
                              <img src={humairaAvatar} alt="Humaira" className="w-full h-full rounded-full object-cover" />
                           </motion.div>
                        )}
                        
                        <div className={cn("flex flex-col gap-1.5 max-w-[76%] sm:max-w-[80%]", m.role === "user" ? "items-end" : "items-start")}>
                           <div className={cn(
                              "px-4.5 py-3 rounded-2xl w-full text-sm sm:text-[15px] leading-relaxed relative group shadow-sm transition-all duration-300", 
                              m.role === "user" 
                                 ? "text-white rounded-tr-none shadow-[0_4px_12px_rgba(249,115,22,0.12)] bg-gradient-to-r" 
                                 : theme === "dark" 
                                    ? "bg-gray-800/90 text-gray-50 rounded-tl-none border border-gray-750" 
                                    : "bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                           )}
                           style={m.role === "user" ? { 
                              backgroundImage: `linear-gradient(135deg, ${MODE_THEMES[mode].accent}, ${MODE_THEMES[mode].accent}ee)`
                           } : undefined}
                           >
                               {m.attachments && m.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2 p-0.5">
                                     {m.attachments.map((imgSrc, idx) => (
                                        <motion.img 
                                           key={idx} 
                                           src={imgSrc} 
                                           alt="Attachment" 
                                           whileHover={{ scale: 1.02 }}
                                           className="max-w-[150px] max-h-[120px] rounded-xl object-cover cursor-zoom-in border border-black/10 dark:border-white/10 shadow-sm inline-block"
                                           onClick={() => setSelectedLightboxImage(imgSrc)}
                                        />
                                     ))}
                                  </div>
                                )}
                                {m.role === "assistant" ? (
                                  <div className="markdown-content prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={parseThinkingAndSteps(m.content)} />
                               ) : (
                                  (m.content || m.attachments) && <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                                )}

                               {/* HOVER COPY BUTTON: Gemini aesthetics */}
                               <div className={cn(
                                  "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 p-1 rounded-lg backdrop-blur-sm shadow-sm",
                                  m.role === "user" ? "bg-black/20 text-white/90" : "bg-gray-100/90 dark:bg-gray-800/90 text-gray-500 dark:text-gray-400"
                               )}>
                                  <button
                                     type="button"
                                     onClick={() => handleCopyMessage(m.id, m.content)}
                                     className="p-1 hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                                     title="মেসেজ কপি করুন"
                                  >
                                     {copiedMessageId === m.id ? (
                                        <Check className="w-3.5 h-3.5 text-green-400" />
                                     ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                     )}
                                  </button>
                               </div>
                           </div>
                           
                           {/* Message timestamp and read indicators */}
                           <div className="flex items-center gap-1.5 px-1 pb-1 text-[10px] select-none text-gray-400 dark:text-gray-500 font-bold">
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
                             className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] rounded-full border overflow-hidden flex items-center justify-center p-0.5 bg-gray-50 dark:bg-gray-900 shadow-md shrink-0 self-start transition-all"
                             style={{ borderColor: MODE_THEMES[mode].accent }}
                             whileHover={{ scale: 1.05 }}
                           >
                              {userProfilePic ? (
                                 <img src={userProfilePic} alt="User" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                 <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-tr from-gray-150 to-gray-200 dark:from-gray-800 dark:to-gray-750 text-gray-600 dark:text-gray-300 font-black text-sm">
                                    {userName ? userName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
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
      </main>

      {/* Floating Bottom Input Form (Only visible when activeChat has messages) */}
      {(activeChat && activeChat.messages.length > 0) && (
         <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5f6fa]/95 via-[#f5f6fa]/70 to-transparent dark:from-[#0b0f19] dark:via-[#0b0f19]/70 dark:to-transparent z-20 pointer-events-none">
            <div className="w-full max-w-3xl mx-auto pointer-events-auto">
               {renderInputForm(false)}
            </div>
         </div>
      )}

      
      {/* Profile Edit Modal */}
      <AnimatePresence>
         {isProfileModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={cn("w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", theme === "dark" ? "bg-gray-900 border border-gray-700" : "bg-white border border-gray-100")}
               >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
                     <h2 className="font-extrabold text-xl tracking-tight text-gray-800 dark:text-gray-100">আপনার প্রোফাইল</h2>
                     <button onClick={() => setIsProfileModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                     </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 overflow-y-auto flex flex-col gap-6">
                     
                     {/* Stats & Streak */}
                     <div className="grid grid-cols-2 gap-3 items-center">
                        <div className={cn("rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border shadow-sm", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-100")}>
                           <span className="text-[28px]">🏆</span>
                           <span className={cn("text-xl font-black mt-1", theme==="dark" ? "text-blue-400" : "text-blue-600")}>{xp}</span>
                           <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">EXP</span>
                        </div>
                        <div className={cn("rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border shadow-sm", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-orange-50 border-orange-100")}>
                           <span className="text-[28px]">🔥</span>
                           <span className={cn("text-xl font-black mt-1", theme==="dark" ? "text-orange-400" : "text-orange-600")}>{streak}</span>
                           <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Streak</span>
                        </div>
                     </div>
                     
                     {/* Input Fields */}
                     <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">নাম</label>
                           <input 
                              type="text" 
                              value={userName} 
                              onChange={(e) => { setUserName(e.target.value); syncProfile("name", e.target.value); }} 
                              className={cn("w-full rounded-xl p-3 font-semibold text-sm border focus:ring-2 focus:ring-[#f97316] outline-none transition-all", theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-800")}
                           />
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">ছবি (URL)</label>
                           <input 
                              type="text" 
                              value={userProfilePic} 
                              onChange={(e) => { setUserProfilePic(e.target.value); syncProfile("photoURL", e.target.value); }} 
                              placeholder="https://..."
                              className={cn("w-full rounded-xl p-3 font-semibold text-sm border focus:ring-2 focus:ring-[#f97316] outline-none transition-all", theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-800")}
                           />
                        </div>

                        <div className="flex flex-col gap-1.5">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">ভালোবাসার ভাষা</label>
                           <select 
                              value={loveLanguage}
                              onChange={(e) => { setLoveLanguage(e.target.value); syncProfile("loveLanguage", e.target.value); }}
                              className={cn("w-full rounded-xl p-3 font-semibold text-sm border focus:ring-2 focus:ring-[#f97316] outline-none transition-all", theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-800")}
                           >
                              <option value="Words of Affirmation">Words of Affirmation (কথায় প্রকাশ)</option>
                              <option value="Acts of Service">Acts of Service (কাজ করে দেওয়া)</option>
                              <option value="Receiving Gifts">Receiving Gifts (উপহার)</option>
                              <option value="Quality Time">Quality Time (সময় কাটানো)</option>
                              <option value="Physical Touch">Physical Touch (স্পর্শ)</option>
                           </select>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">যেকোনো বিশেষ দিন</label>
                           <input 
                              type="text" 
                              value={anniversaryDate} 
                              onChange={(e) => { setAnniversaryDate(e.target.value); syncProfile("anniversaryDate", e.target.value); }} 
                              placeholder="e.g. 14 February"
                              className={cn("w-full rounded-xl p-3 font-semibold text-sm border focus:ring-2 focus:ring-[#f97316] outline-none transition-all", theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-800")}
                           />
                        </div>

                        <div className="flex flex-col gap-1.5">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">হুমায়রা AI এভাটার (স্থায়ী / Permanent)</label>
                           <div className="flex gap-3 items-center">
                              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-orange-200 dark:border-gray-750 shadow-sm">
                                 <img src={humairaAvatar} alt="Humaira Permanent Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                 <p className="text-xs font-extrabold text-[#f97316]">হুমায়রা পারমানেন্ট এভাটার ✨</p>
                                 <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">এটি হুমায়রার স্থায়ী এবং অফিসিয়াল এভাটার হিসেবে সর্বজনীনভাবে সেট করা হয়েছে।</p>
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="h-[1px] w-full bg-gray-200 dark:bg-gray-800 my-2" />

                     {/* Achievements */}
                     <div>
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">অর্জনসমূহ (Achievements)</h3>
                        <div className="flex flex-col gap-2">
                            {achievements.length > 0 ? achievements.map((ach, idx) => (
                               <div key={idx} className={cn("flex items-center gap-3 p-3 text-sm font-semibold rounded-xl border", theme === "dark" ? "bg-purple-900/20 border-purple-800 text-purple-300" : "bg-purple-50 border-purple-100 text-purple-700")}>
                                  <Trophy className="w-4 h-4" />
                                  {ach}
                               </div>
                            )) : (
                               <div className={cn("flex items-center gap-3 p-3 text-sm font-semibold rounded-xl border", theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500")}>
                                  <Star className="w-4 h-4 opacity-50" />
                                  আপনার এখনও কোনো অর্জন নেই
                               </div>
                            )}
                            {(achievements.length === 0 && firebaseUser) && (
                               <button 
                                 onClick={() => {
                                    const initial = ["First Chat"];
                                    setAchievements(initial);
                                    syncProfile("achievements", initial);
                                 }}
                                 className="text-xs text-orange-500 font-bold underline text-left mt-1 ml-1"
                               >
                                 Claim "First Chat" Badge
                               </button>
                            )}
                        </div>
                     </div>

                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
         {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={cn("w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", theme === "dark" ? "bg-gray-900 border border-gray-700" : "bg-white border border-gray-100")}
               >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
                     <div className="flex items-center gap-2.5">
                        <Settings className="w-5 h-5 text-orange-500 animate-spin-slow" />
                        <h2 className="font-extrabold text-xl tracking-tight text-gray-800 dark:text-gray-100">অ্যাপলিকেশন সেটিংস ⚙️</h2>
                     </div>
                     <button onClick={() => { setIsSettingsOpen(false); if (soundEnabled) playSweetChime(); }} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                     </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 overflow-y-auto flex flex-col gap-5 scrollbar-thin">
                     
                     {/* Chatbot Profile Name */}
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">চ্যাটবটের নাম (Chatbot Name)</label>
                        <input 
                           type="text" 
                           value={botName} 
                           onChange={(e) => {
                              setBotName(e.target.value);
                              localStorage.setItem("botName", e.target.value);
                           }} 
                           className={cn("w-full rounded-xl p-3 font-semibold text-sm border focus:ring-2 focus:ring-[#f97316] outline-none transition-all", theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-550" : "bg-gray-50 border-gray-200 text-gray-800")}
                           placeholder="চ্যাটবটের নাম লিখুন..."
                        />
                     </div>

                     {/* AI Creativity (Temperature) Slider */}
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                           <span>এআই ক্রিয়েটিভিটি (Temperature)</span>
                           <span className="text-[#f97316] font-extrabold">{aiCreativity.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <Sliders className="w-4 h-4 text-gray-405" />
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
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#f97316]"
                           />
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-gray-400 dark:text-gray-500 select-none">
                           <span>শান্ত (Strict)</span>
                           <span>ভারসাম্যপূর্ণ (Balanced)</span>
                           <span>সৃজনশীল (Creative)</span>
                        </div>
                     </div>

                     {/* Audio toggle */}
                     <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10">
                        <div className="flex flex-col gap-0.5">
                           <span className="text-xs font-bold text-gray-700 dark:text-gray-200">সাউন্ড ইফেক্ট (Sound Effects)</span>
                           <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">মেসেজ শেষ হলে চমৎকার চিম টিউন বাজবে</span>
                        </div>
                        <button 
                           onClick={() => {
                              const next = !soundEnabled;
                              setSoundEnabled(next);
                              localStorage.setItem("soundEnabled", String(next));
                              if (next) playSweetChime();
                           }}
                           className={cn("w-12 h-6 rounded-full p-1 transition-colors relative duration-300 cursor-pointer", soundEnabled ? "bg-[#f97316]" : "bg-gray-300 dark:bg-gray-700")}
                        >
                           <div className={cn("w-4 h-4 rounded-full bg-white shadow-md transform transition-all duration-300", soundEnabled ? "translate-x-6" : "translate-x-0")} />
                        </button>
                     </div>

                     <div className="h-[1px] w-full bg-gray-200 dark:bg-gray-800 my-1" />

                     {/* Mode System Prompts Customize */}
                     <div className="flex flex-col gap-2.5">
                        <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">মুড অনুযায়ী সিস্টেম প্রম্পট (System Prompt)</label>
                        
                        <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
                           {(Object.keys(MODES) as Mode[]).map((mKey) => (
                              <button
                                 key={mKey}
                                 onClick={() => {
                                    setEditPromptMode(mKey);
                                 }}
                                 className={cn(
                                    "px-2 px-1.5 text-[11px] font-bold rounded-lg transition-all flex-1 text-center shrink-0 min-w-[65px] cursor-pointer",
                                    editPromptMode === mKey
                                       ? "bg-white dark:bg-gray-700 text-[#f97316] dark:text-white shadow-sm"
                                       : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                 )}
                              >
                                 {MODES[mKey].label.split(" ")[0]}
                              </button>
                           ))}
                        </div>

                        {/* TextArea for editing the active prompt */}
                        <div className="relative">
                           <textarea
                              rows={5}
                              value={customPrompts[editPromptMode] || MODES[editPromptMode].prompt}
                              onChange={(e) => handleUpdatePrompt(editPromptMode, e.target.value)}
                              className={cn("w-full rounded-xl p-3 font-semibold text-xs border focus:ring-2 focus:ring-[#f97316] outline-none transition-all leading-relaxed", theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-gray-50 border-gray-200 text-gray-700")}
                           />
                           <button 
                              onClick={() => {
                                 resetPromptToDefault(editPromptMode);
                                 playSweetChime();
                              }}
                              className="absolute bottom-3 right-3 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 text-[10px] cursor-pointer"
                              title="ডিফল্ট প্রম্পটে রিসেট করুন"
                           >
                              <RotateCcw className="w-3.5 h-3.5" />
                              রিসেট
                           </button>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-505 font-semibold leading-relaxed">
                           💡 হুমাইরা {MODES[editPromptMode].label} এ কীভাবে কথা বলবে তা সম্পূর্ণরূপে এই প্রম্পট দ্বারা নিয়ন্ত্রিত হয়।
                        </p>
                     </div>

                     <div className="h-[1px] w-full bg-gray-200 dark:bg-gray-800 my-1" />

                     {/* Danger actions */}
                     <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest">বিপজ্জনক অ্যাকশন (Danger Zone)</span>
                        <button 
                           onClick={() => {
                              if (confirm("আপনি কি নিশ্চিতভাবে সব চ্যাট ডিলিট করতে চান? এটি আর ফিরিয়ে আনা সম্ভব নয়।")) {
                                 setChats([]);
                                 setActiveChatId(null);
                                 setIsSettingsOpen(false);
                                 if (soundEnabled) playSweetChime();
                              }
                           }}
                           className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-950/40 hover:bg-red-500 hover:text-white bg-red-50/50 dark:bg-red-950/10 text-red-600 dark:text-red-400 flex items-center justify-center gap-2 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer min-h-[40px]"
                        >
                           🗑️ সমস্ত চ্যাট হিস্ট্রি মুছে ফেলুন
                        </button>
                     </div>

                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end shrink-0 bg-gray-50 dark:bg-gray-900/40">
                     <button 
                        onClick={() => {
                           setIsSettingsOpen(false);
                           if (soundEnabled) playSweetChime();
                        }}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-[#f97316] text-white font-extrabold text-sm hover:brightness-105 active:scale-95 transition-all shadow-md cursor-pointer"
                     >
                        সংরক্ষণ ও বন্ধ করুন
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

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
               className={cn("fixed top-0 left-0 bottom-0 w-[280px] sm:w-[320px] z-50 flex flex-col shadow-2xl", theme === 'dark' ? "bg-[#111827] border-r border-gray-800" : "bg-white border-r border-gray-200")}
            >
               {/* Sidebar Header */}
               <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border-2 border-[#f97316] overflow-hidden bg-orange-100 p-0.5">
                       <img src={humairaAvatar} alt="Humaira" className="w-full h-full object-cover" />
                   </div>
                   <span className="font-extrabold text-lg text-gray-900 dark:text-gray-50 tracking-tight">হুমায়রা এআই 💖</span>
               </div>
               
               {/* New Chat Button */}
               <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <button onClick={createNewChat} className="w-full py-3 rounded-xl border border-orange-200 dark:border-orange-900 flex items-center justify-center gap-2 font-bold text-[#f97316] hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all active:scale-[0.98] shadow-sm select-none cursor-pointer min-h-[44px]">
                     <Plus className="w-4 h-4" /> নতুন চ্যাট শুরু করুন
                  </button>
               </div>

               {/* Sidebar Sections */}
               <div className="flex-1 overflow-y-auto w-full pt-2 pb-6 space-y-5 px-3">
                   {/* Roast Modes */}
                   <div>
                       <h3 className="px-3 text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-widest mb-2">হুমায়রার মুডসমূহ 💖</h3>
                       <div className="flex flex-col gap-1">
                           {(["NORMAL", "ROMANTIC", "FUN"] as Mode[]).map(m => (
                               <button key={m} onClick={() => { setMode(m); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 rounded-xl font-bold text-[15px] flex items-center gap-3 w-full text-left transition-colors", mode === m ? (m === "ROMANTIC" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400" : "bg-[#f9f0e8] text-[#c2410c] dark:bg-orange-950/40 dark:text-orange-300") : "text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800")}>
                                   {MODES[m].label}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Normal */}
                   <div>
                       <h3 className="hidden">সাধারণ মোড 💬</h3>
                       <div className="flex flex-col gap-1">
                           {([] as Mode[]).map(m => (
                               <button key={m} onClick={() => { setMode(m); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 rounded-[12px] font-bold text-[15px] flex items-center gap-3 w-full text-left transition-colors", mode === m ? "bg-[#f9f0e8] text-[#c2410c] dark:bg-orange-900/40 dark:text-orange-300" : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                                   {MODES[m].label}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Pro modes */}
                   <div>
                       <h3 className="px-3 text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-widest mb-2">টুলস ও ভিআইপি মোডসমূহ 👑</h3>
                       <div className="flex flex-col gap-1">
                           {(["ISLAMIC", "LEGEND"] as Mode[]).map(m => {
                               const Icon = MODES[m].icon;
                               return (
                               <button key={m} onClick={() => { setMode(m); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 rounded-[12px] font-bold text-[15px] flex items-center gap-3 w-full text-left transition-colors", mode === m ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800")}>
                                   <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center text-white">
                                      <Icon className="w-3.5 h-3.5" />
                                   </div>
                                   <span className="flex-1">{MODES[m].label}</span>
                                   <span className="bg-[#fef3c7] text-[#d97706] text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase border border-[#fde68a]">PRO</span>
                               </button>
                           )})}
                       </div>
                   </div>
                   
                   {/* Recents */}
                   <div>
                       <h3 className="px-3 text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-widest mb-2 mt-4">সাম্প্রতিক চ্যাটসমূহ ⏳</h3>
                       <div className="flex flex-col gap-1">
                           {chats.length === 0 ? (
                               <div className="px-3 py-2 text-sm text-gray-400">কোনো chat নেই</div>
                           ) : (
                               chats.map(chat => (
                                   <div key={chat.id} className="group flex items-center w-full">
                                      <button onClick={() => { setActiveChatId(chat.id); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 flex-1 rounded-l-xl font-bold text-sm text-left truncate transition-colors", activeChatId === chat.id ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" : "text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800")}>
                                          {chat.title}
                                      </button>
                                      <button onClick={(e) => deleteChat(chat.id, e)} className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-r-xl opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 transition-all">
                                          <LogOut className="w-4 h-4" />
                                      </button>
                                   </div>
                               ))
                           )}
                       </div>
                   </div>
               </div>

               {/* Profile Area bottom */}
               <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
                  <div className="flex flex-col gap-3">
                     <div className="bg-gray-100 dark:bg-gray-800 rounded-[16px] p-3 flex items-center gap-3 mb-2 shadow-sm border border-gray-200/50 dark:border-gray-700">
                        {firebaseUser ? (
                          <>
                             <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                {userProfilePic ? <img src={userProfilePic} className="w-full h-full object-cover"/> : <User className="w-full h-full p-2 text-gray-400"/>}
                             </div>
                             <div className="flex flex-col flex-1 cursor-pointer hover:opacity-80" onClick={() => setIsProfileModalOpen(true)}>
                                <span className="font-extrabold text-sm text-gray-800 dark:text-gray-100 truncate w-32">{userName}</span>
                                <span className="font-medium text-[11px] text-gray-500 truncate w-36">{firebaseUser.email}</span>
                             </div>
                          </>
                        ) : (
                          <button onClick={handleLogin} className="flex items-center gap-3 w-full">
                             <div className="w-10 h-10 rounded-full bg-[#f97316]/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-[#f97316]" />
                             </div>
                             <span className="font-extrabold text-[#f97316] text-sm text-left">Login / Sign up</span>
                          </button>
                        )}
                     </div>

                      <button 
                         onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }} 
                         className="w-full py-2.5 rounded-[12px] border border-orange-200 dark:border-orange-950/50 bg-orange-50/50 dark:bg-orange-950/20 flex items-center justify-center gap-2 font-extrabold text-[13px] text-[#f97316] dark:text-orange-400 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 shadow-sm transition-all cursor-pointer min-h-[40px] mb-1.5"
                      >
                         <Settings className="w-4 h-4 animate-spin-slow" />
                         অ্যাডভান্সড সেটিংস প্যানেল ⚙️
                      </button>

                     <div className="flex items-center gap-2">
                        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="flex-1 py-2.5 rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center gap-2 font-semibold text-[13px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors">
                           {theme === "light" ? <Moon className="w-4 h-4"/> : <Sun className="w-4 h-4"/>}
                           {theme === "light" ? "Dark Mode" : "Light Mode"}
                        </button>
                        {firebaseUser && (
                          <button onClick={handleLogout} className="flex-1 py-2.5 rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center gap-2 font-semibold text-[13px] text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/30 dark:hover:text-red-400 shadow-sm transition-colors">
                             <LogOut className="w-4 h-4"/>
                             Logout
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
