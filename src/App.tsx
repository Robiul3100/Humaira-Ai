
import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Menu, Star, Plus, Heart, Flame, Smile, Trophy, MessageCircle, Moon, Anchor, Sun, LogOut, Mic, Layout, User, Send, Check, Shield, Settings, Sliders, RotateCcw
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
  { id: "gemini-2.0-flash", name: "Gemini" }
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
    setInputValue(e.target.value);
    localStorage.setItem(`chatDraft_${activeChatId || 'home'}`, e.target.value);
  };

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
    if (!text || isGenerating) return;

    let currentChatId = activeChatId;

    if (!currentChatId) {
       const newChat: Chat = {
          id: Math.random().toString(36).substring(7),
          title: text.substring(0, 30),
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

    const userMsg: Message = { id: Math.random().toString(36).substring(7), role: "user", content: text, timestamp: new Date() };

    setChats(prev => prev.map(c => 
      c.id === currentChatId 
        ? { ...c, messages: [...c.messages, userMsg], title: c.messages.length === 0 ? text.substring(0, 30) : c.title, updatedAt: new Date() } 
        : c
    ));

    setInputValue("");
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
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", timestamp: new Date() };
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
    systemInstruction: sysInstruction,
    model: currentModel.id
  }),
  signal: abortControllerRef.current.signal
});

if (!response.ok) {
  throw new Error("Failed to connect to AI server");
}

const data = await response.json();

if (data.error) {
  fullText = `[Error: ${data.error}]`;
} else {
  fullText = data.text || "";
}

setChats(prev => prev.map(c =>
  c.id === currentChatId
    ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: fullText } : m) }
    : c
));
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
             syncChatData(currentChats[updatedChatIndex]);
         }
         return currentChats;
      });
      abortControllerRef.current = null;
    }
  };

  const renderInputForm = (isCentered: boolean) => {
     const t = MODE_THEMES[mode];
     return (
         <form 
           onSubmit={e => { e.preventDefault(); handleSendMessage(); }} 
           className={cn("flex flex-col gap-1.5 rounded-[24px] border transition-all duration-300 relative w-full", 
              theme === "dark" 
                ? cn("border-gray-800 focus-within:border-[#f97316]/80 focus-within:ring-2 focus-within:ring-[#f97316]/10", 
                     isCentered ? "shadow-xl bg-gray-900/90" : "shadow-xl bg-gray-950/80 backdrop-blur-md"
                  ) 
                : cn("border-gray-200 focus-within:border-[#f97316]/80 focus-within:ring-2 focus-within:ring-[#f97316]/5", 
                     isCentered ? "shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white" : "shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white/95 backdrop-blur-md"
                  ),
              activeChat ? "" : "border-orange-500/40"
           )}
           style={{ 
             padding: '8px',
             borderColor: isModeSelectorOpen ? t.accent : undefined,
             boxShadow: isModeSelectorOpen ? `0 0 15px ${t.accent}20` : undefined
           }}
         >
           <textarea
              style={{ color: theme === "dark" ? "#f3f4f6" : "inherit" }}
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
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
                 {inputValue.trim() ? (
                    <button type="submit" className={cn("p-2.5 text-white hover:brightness-105 active:scale-95 rounded-full transition-all shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] bg-gradient-to-r", t.buttonBg)} disabled={isGenerating}>
                        <Send className="w-4.5 h-4.5 ml-0.5" />
                    </button>
                 ) : (
                    <button type="button" className="p-2.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <Mic className="w-4.5 h-4.5" />
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
                  className="p-1 px-2.5 -ml-1.5 rounded-xl border border-gray-200 dark:border-gray-705 bg-gray-50/50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold active:bg-gray-100 dark:active:bg-gray-700 transition-all shadow-sm select-none"
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
                     <div key={m.id} className={cn("flex w-full gap-2.5 items-end", m.role === "user" ? "justify-end" : "justify-start")}>
                        {m.role === "assistant" && (
                           <motion.div 
                             className="w-8 h-8 rounded-full border overflow-hidden flex items-center justify-center p-0.5 bg-amber-50 shadow-sm shrink-0"
                             style={{ borderColor: MODE_THEMES[mode].accent }}
                             animate={{ scale: [1, 1.05, 1] }}
                             transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                           >
                              <img src={humairaAvatar} alt="Humaira" className="w-full h-full rounded-full object-cover" />
                           </motion.div>
                        )}
                        <div className={cn("px-5 py-3.5 max-w-[78%] sm:max-w-[82%] rounded-[20px]", 
                           m.role === "user" ? "text-white rounded-br-[4px] shadow-sm font-medium" : 
                           theme === "dark" ? "bg-gray-800 text-gray-50 rounded-bl-[4px] shadow-sm border border-gray-750" : "bg-white text-gray-800 rounded-bl-[4px] shadow-md border border-gray-100"
                        )}
                        style={m.role === "user" ? { backgroundColor: MODE_THEMES[mode].accent } : undefined}
                        >
                            {m.role === "assistant" ? (
                               <div className="markdown-content" dangerouslySetInnerHTML={parseThinkingAndSteps(m.content)} />
                            ) : (
                               <p className="whitespace-pre-wrap">{m.content}</p>
                            )}
                        </div>
                     </div>
                  );
               })}
               
               {/* Skeleton Shimmer thinking placeholder */}
               {isGenerating && activeChat.messages[activeChat.messages.length - 1]?.role === "assistant" && activeChat.messages[activeChat.messages.length - 1]?.content === "" && (
                  <SkeletonShimmer theme={theme} />
               )}

               {/* CSS typing indicator during generation */}
               {isGenerating && activeChat.messages[activeChat.messages.length - 1]?.role === "assistant" && activeChat.messages[activeChat.messages.length - 1]?.content !== "" && (
                  <div className="flex w-full justify-start mt-1">
                     <TypingIndicator theme={theme} />
                  </div>
               )}
            </div>
         )}
      </main>

      {/* Floating Bottom Input Form (Only visible when activeChat has messages) */}
      {(activeChat && activeChat.messages.length > 0) && (
         <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f5f6fa]/95 via-[#f5f6fa]/70 to-transparent dark:from-[#0b0f19] dark:via-[#0b0f19]/70 dark:to-transparent z-20 pointer-events-none">
            <div className="w-full pointer-events-auto">
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
        `}
      </style>
      </div>
    </div>
  );
}
