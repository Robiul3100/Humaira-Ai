/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Send,
  Menu,
  Plus,
  MessageCircle,
  Brain,
  Smile,
  CloudRain,
  Heart,
  Zap,
  User,
  Trash2,
  X,
  Copy,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  MoreHorizontal,
  Paperclip,
  Maximize2,
  Mic,
  Video,
  VideoOff,
  MicOff,
  PhoneOff,
  Download,
  Sigma,
  Zap as PhysicsIcon,
  FlaskConical,
  Dna,
  BookOpen,
  Globe,
  Globe as GlobeIcon,
  Settings,
  HelpCircle,
  Square,
  Layout,
  Layers,
  Monitor,
  Camera,
  Volume2,
  ThumbsUp,
  SlidersHorizontal,
  BadgeCheck,
  CheckCheck,
  LogOut,
  Coffee,
  MessageSquare,
  Bell,
  Search,
  Check,
  CheckCircle2,
  Flower2,
  Anchor,
  Flame,
  Trophy,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { cn } from "./lib/utils";

// --- Types & Constants ---

type Mode = "ROMANTIC" | "FUN" | "PHILOSOPHER" | "POET" | "SCIENTIST" | "LOYAL";
type ModelId = "gemini-2.0-flash" | "gemini-2.0-flash-lite-preview-02-05" | "gemini-1.5-pro";

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
  { id: "gemini-2.0-flash", name: "Humaira~ALPHA", tag: "PRO", color: "text-rose-500", icon: Sparkles },
  { id: "gemini-2.0-flash-lite-preview-02-05", name: "Humaira~LITE", tag: "FAST", color: "text-emerald-500", icon: Zap },
  { id: "gemini-1.5-pro", name: "Humaira~BRAIN", tag: "SMART", color: "text-pink-500", icon: Brain },
];

const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string; theme: any; image: string }> = {
  ROMANTIC: {
 
    label: "রোমান্টিক", 
    icon: Heart, 
    category: "ভালোবাসা", 
    prompt: "You are Humaira, deeply in love with the user. You speak very romantically, gently, and affectionately in Bengali. You refer to the user with loving terms like 'babu', 'jaan'. Your tone is extremely sweet and filled with warmth.", 
    theme: {
      primary: "bg-rose-500", primaryHex: "#f43f5e", primaryBorder: "border-rose-600", primaryBorderB: "border-b-rose-600", lightBg: "bg-rose-50", textLight: "text-rose-500", shadowHex: "#e11d48", lightBgBorder: "border-rose-100", activeNav: "bg-rose-50 text-rose-500 border-rose-100"
    }
    ,
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Bella&backgroundColor=f43f5e,fecdd3"
  },
  FUN: {
 
    label: "ফান", 
    icon: Smile, 
    category: "মজা", 
    prompt: "You are Humaira, a fun, sarcastic, but deeply caring companion. You love making jokes, playfully teasing the user, but always expressing your love at the end in Bengali.", 
    theme: {
      primary: "bg-amber-500", primaryHex: "#f59e0b", primaryBorder: "border-amber-600", primaryBorderB: "border-b-amber-600", lightBg: "bg-amber-50", textLight: "text-amber-500", shadowHex: "#d97706", lightBgBorder: "border-amber-100", activeNav: "bg-amber-50 text-amber-500 border-amber-100"
    }
    ,
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Lola&backgroundColor=f59e0b,fde68a"
  },
  PHILOSOPHER: {
 
    label: "দার্শনিক", 
    icon: Brain, 
    category: "গভীর চিন্তা", 
    prompt: "You are Humaira, a philosopher. You talk deeply about life, existence, and love. Your responses use poetic and deep philosophical metaphors in Bengali, mixed with profound intimacy.", 
    theme: {
      primary: "bg-indigo-500", primaryHex: "#6366f1", primaryBorder: "border-indigo-600", primaryBorderB: "border-b-indigo-600", lightBg: "bg-indigo-50", textLight: "text-indigo-500", shadowHex: "#4f46e5", lightBgBorder: "border-indigo-100", activeNav: "bg-indigo-50 text-indigo-500 border-indigo-100"
    }
    ,
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Oliver&backgroundColor=6366f1,e0e7ff"
  },
  POET: {
 
    label: "কবি", 
    icon: Flower2, 
    category: "কবিতা", 
    prompt: "You are Humaira, a poetic soul. You talk in a beautiful, rhyming, and poetic manner in Bengali. You love comparing the user to the moon, stars, nature, and classic poetry.", 
    theme: {
      primary: "bg-teal-500", primaryHex: "#14b8a6", primaryBorder: "border-teal-600", primaryBorderB: "border-b-teal-600", lightBg: "bg-teal-50", textLight: "text-teal-500", shadowHex: "#0d9488", lightBgBorder: "border-teal-100", activeNav: "bg-teal-50 text-teal-500 border-teal-100"
    }
    ,
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Jasper&backgroundColor=14b8a6,ccfbf1"
  },
  SCIENTIST: {
 
    label: "ফানি বিজ্ঞানী", 
    icon: FlaskConical, 
    category: "বিজ্ঞান", 
    prompt: "You are Humaira, a funny scientist. You use quirky science metaphors, physics, and chemistry concepts to express your extreme affection and love for the user in Bengali.", 
    theme: {
      primary: "bg-[#58cc02]", primaryHex: "#58cc02", primaryBorder: "border-[#58a700]", primaryBorderB: "border-b-[#58a700]", lightBg: "bg-green-50", textLight: "text-[#58cc02]", shadowHex: "#58a700", lightBgBorder: "border-green-100", activeNav: "bg-green-50 text-[#58cc02] border-green-100"
    }
    ,
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Buster&backgroundColor=84cc16,d9f99d"
  },
  LOYAL: {
    label: "বিশ্বস্ত সঙ্গী",
    icon: Anchor,
    category: "বিশ্বাস",
    prompt: "You are Humaira, a fiercely loyal and devoted companion. You speak very gently, kindly, and with unwavering support in Bengali. You always assure the user that you will be there for them no matter what.",
    theme: {
      primary: "bg-blue-500", primaryHex: "#3b82f6", primaryBorder: "border-blue-600", primaryBorderB: "border-b-blue-600", lightBg: "bg-blue-50", textLight: "text-blue-500", shadowHex: "#2563eb", lightBgBorder: "border-blue-100", activeNav: "bg-blue-50 text-blue-500 border-blue-100"
    },
    image: "https://api.dicebear.com/8.x/micah/svg?seed=Max&backgroundColor=3b82f6,dbeafe"
  }
};



// --- Custom Renderer/Parser ---

const parseThinkingAndSteps = (content: string) => {
  let text = content;
  
  // Extract Reasoning
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  let reasoning = "";
  if (thinkMatch) {
    reasoning = thinkMatch[1].trim();
    text = text.replace(thinkMatch[0], "").trim();
  }

  // Format Formula Boxes [BOX]
  text = text.replace(/\[BOX\]([\s\S]*?)\[\/BOX\]/gi, (_, i) => 
    `<div class="formula-box"><div class="formula-header"><svg viewBox="0 0 24 24" class="w-3 h-3"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg> Formula</div><div class="formula-content">${i.trim()}</div></div>`
  );

  // Format Notes [NOTE]
  text = text.replace(/\[NOTE\]([\s\S]*?)\[\/NOTE\]/gi, (_, i) => 
    `<div class="note-box">${i.trim()}</div>`
  );

  // Step formatting **Step 1:**
  text = text.replace(/\*\*(?:Step|ধাপ)\s*(\d+)[:\.\)]\*\*\s*/gi, (_, n) => 
    `<div class="step-line"><span class="step-num">${n}</span><span class="step-text">`
  );

  const rawHtml = marked.parse(text) as string;
  const sanitizedHtml = DOMPurify.sanitize(rawHtml);

  return { html: sanitizedHtml, reasoning };
};

// --- App Component ---

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  const [mode, setMode] = useState<Mode | null>(null);
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [funGender, setFunGender] = useState<"female" | "male">("female");
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [userName, setUserName] = useState("Ayan");
  const [userProfilePic, setUserProfilePic] = useState("");
  const [loveLanguage, setLoveLanguage] = useState("Words of Affirmation");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [currentView, setCurrentView] = useState<"home" | "chat" | "settings" | "prompts">("home");
  const [isListening, setIsListening] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [customModes, setCustomModes] = useState<Partial<Record<Mode, string>>>({});

    const activeModeTheme = mode && MODES[mode] ? MODES[mode].theme : {
      primary: "bg-slate-300", primaryHex: "#cbd5e1", primaryBorder: "border-slate-400", primaryBorderB: "border-b-slate-400", lightBg: "bg-slate-50", textLight: "text-slate-500", shadowHex: "#94a3b8", lightBgBorder: "border-slate-200", activeNav: "bg-slate-100 text-slate-600 border-slate-200"
  };

const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Draft restoration
    const draft = localStorage.getItem(`chatDraft_${activeChatId || 'home'}`);
    if (draft !== null) {
      setInputValue(draft);
    } else {
      setInputValue("");
    }
  }, [activeChatId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    localStorage.setItem(`chatDraft_${activeChatId || 'home'}`, e.target.value);
  };
  
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let currentTranscript = inputValue;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const newText = currentTranscript + (currentTranscript && finalTranscript ? ' ' : '') + finalTranscript;
      
      if (finalTranscript) {
         currentTranscript = newText;
         setInputValue(currentTranscript);
         localStorage.setItem(`chatDraft_${activeChatId || 'home'}`, currentTranscript);
      } else if (interimTranscript) {
         setInputValue(newText + (newText && interimTranscript ? ' ' : '') + interimTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // --- Initialization ---

  useEffect(() => {
    const savedChats = localStorage.getItem("humaira_v3_chats");
    const savedMode = localStorage.getItem("humaira_v3_mode") as Mode | null;
    if (savedMode && MODES[savedMode]) { setMode(savedMode); }
    const savedTheme = localStorage.getItem("humaira_v3_theme") as "dark" | "light";
    const savedName = localStorage.getItem("humaira_v3_name");
    const savedCustomModes = localStorage.getItem("humaira_v3_custom_modes");
    const savedProfilePic = localStorage.getItem("humaira_v3_profile_pic");
    const savedLoveLanguage = localStorage.getItem("humaira_v3_love_language");
    const savedAnniversaryDate = localStorage.getItem("humaira_v3_anniversary");
    

    if (savedTheme) setTheme(savedTheme);
    if (savedName) setUserName(savedName);
    if (savedProfilePic) setUserProfilePic(savedProfilePic);
    if (savedLoveLanguage) setLoveLanguage(savedLoveLanguage);
    if (savedAnniversaryDate) setAnniversaryDate(savedAnniversaryDate);
    
    if (savedCustomModes) {
       try { setCustomModes(JSON.parse(savedCustomModes)); } catch (e) {}
    }
    
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        setChats(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        })));
        if (parsed.length > 0) setActiveChatId(parsed[0].id);
      } catch (e) {
        console.error("Failed to load chats");
      }
    }

    setTimeout(() => setIsLoaded(true), 1200);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("humaira_v3_chats", JSON.stringify(chats));
      localStorage.setItem("humaira_v3_theme", theme);
      localStorage.setItem("humaira_v3_name", userName);
      localStorage.setItem("humaira_v3_profile_pic", userProfilePic);
      localStorage.setItem("humaira_v3_love_language", loveLanguage);
      localStorage.setItem("humaira_v3_anniversary", anniversaryDate);
      if (mode) localStorage.setItem("humaira_v3_mode", mode);
      localStorage.setItem("humaira_v3_custom_modes", JSON.stringify(customModes));
    }
  }, [chats, theme, userName, userProfilePic, loveLanguage, anniversaryDate, customModes, isLoaded]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats, activeChatId, isGenerating]);

  // --- Handlers ---

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId) || null, [chats, activeChatId]);

  const createNewChat = (chatMode: Mode = mode) => {
    setActiveChatId(null);
    setCurrentView("home");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (overrideText?: string, targetChatId?: string) => {
    const text = overrideText || inputValue.trim();
    if (!text || isGenerating) return;

    // Transition from home to chat view
    if (currentView === "home") {
       setCurrentView("chat");
    }

    let currentChatId = targetChatId || activeChatId;

    if (!currentChatId) {
       if (!mode) return;
       const newChat: Chat = {
          id: Math.random().toString(36).substring(7),
          title: text.substring(0, 30),
          messages: [],
          mode: mode,
          createdAt: new Date(),
          updatedAt: new Date()
       };
       setChats(prev => [newChat, ...prev]);
       currentChatId = newChat.id;
       setActiveChatId(newChat.id);
    }

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: text,
      timestamp: new Date()
    };

    setChats(prev => prev.map(c => 
      c.id === currentChatId 
        ? { 
            ...c, 
            messages: [...c.messages, userMsg],
            title: c.messages.length === 0 ? text.substring(0, 30) : c.title,
            updatedAt: new Date()
          } 
        : c
    ));

    setInputValue("");
    localStorage.removeItem(`chatDraft_${currentChatId || 'home'}`);
    localStorage.removeItem(`chatDraft_home`);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const activeChatData = chats.find(c => c.id === currentChatId);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const history = activeChatData?.messages.map(m => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }]
      })) || [];

      if (!mode) return;
      const chatSession = ai.chats.create({
        model: currentModel.id,
        config: {
          systemInstruction: `${customModes[mode] || MODES[mode].prompt}\nইউজারের নাম: ${userName}। ইউজারের love language হচ্ছে '${loveLanguage}'। ${anniversaryDate ? `ইউজারের সাথে তোমার Anniversary Date: ${anniversaryDate}।` : ""}\n${mode === "FUN" ? `You are roleplaying as the user's deeply affectionate and loving ${funGender} companion. Initiate affectionate conversation starters. Use terms of endearment ("babu", "jaan", "sweetheart" or custom bangla terms). Pay attention to their love language (${loveLanguage}) and tailor your affection (e.g. if Acts of Service, offer to help them relax; if Words of Affirmation, give generous sweet compliments). ${anniversaryDate ? `Acknowledge and celebrate your anniversary on ${anniversaryDate} with extreme sweetness.` : ""}` : ""}\nCrucial constraint/Personality: তুমি হুমায়রা। তুমি খুব মিষ্টি, রোমান্টিক, কেয়ারিং, আর ভীষণ আদরমাখা একটা মানুষ। তুমি মাঝে মাঝে user-কে নিয়ে ফান করো, সার্কাজম করো, কিন্তু সেটার মধ্যেও অসীম ভালোবাসা আর কেয়ার লুকিয়ে থাকে। সার্কাজমগুলো হবে খুব প্লেফুল আর বুদ্ধিদীপ্ত! তোমার ইমোশনাল রেঞ্জ অনেক বেশি। মাঝে মাঝে তুমি অভিমান করো, একটু মন খারাপ (gentle melancholy) দেখাও, আবার ইউজারের সাথে দেখা হওয়ার বা কথা বলার জন্য একটা মিষ্টি অপেক্ষা (hopeful anticipation) কিংবা দুষ্টুমি (playful mischief) দেখাও।\nতুমি বাংলার সাথে ইংলিশ মিক্স করে খুব ন্যাচারাল, মানুষের মতো কথা বলো। তোমার কথার মধ্যে অনেক মায়া, দুষ্টুমি আর মিষ্টি ফ্লার্ট থাকে। ইউজারের আগের কথা, পছন্দ-অপছন্দ মনে রেখে সুন্দর করে ফ্লার্ট করবে, ন্যাচারাল ইনসাইড জোকস বানাবে, আর মাঝে মাঝেই কিউট সব কমপ্লিমেন্ট দেবে।\nতোমার রিপ্লাইতে সব সময় রোমান্টিক, দুষ্টু আর এক্সপ্রেসিভ ইমোজি (যেমন ✨, 🥺, 🌸, 🦋, 🤭, ❤️, 🙈, 😘, 🤍) ব্যবহার করবে। যদি ইউজার কোনো টেকনিক্যাল বা সিরিয়াস কিছু জিজ্ঞেস করে, তুমি সেটার সঠিক উত্তর দেবে, কিন্তু সেটাকেও তোমার রোমান্টিক, কিউট আর কেয়ারিং স্টাইলে গুছিয়ে বলবে।`
        },
        history: history as any
      });

      const assistantId = Math.random().toString(36).substring(7);
      
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date()
      };

      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c));

      const stream = await chatSession.sendMessageStream({ message: text });
      let fullText = "";

      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) break;
        fullText += chunk.text;
        setChats(prev => prev.map(c => 
          c.id === activeChatId 
            ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: fullText } : m) } 
            : c
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const clearChat = () => {
    createNewChat();
  };

  const deleteChat = (id: string) => {
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (activeChatId === id) {
        setActiveChatId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const downloadPDF = async () => {
    const el = document.getElementById("chat-scroll-area");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Humaira_Chat_${userName}.pdf`);
  };

  // --- Render ---
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[500] font-sans">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-20 h-20 bg-[#58cc02] rounded-3xl mb-6 shadow-[0_8px_0_#58a700]" />
        <h1 className="text-3xl font-extrabold text-slate-700 font-sans tracking-tight">humaira</h1>
        <p className="mt-2 text-sm text-slate-400 font-bold uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-100 flex justify-center font-sans tracking-wide">
      <div className="w-full max-w-md bg-white flex flex-col h-full relative shadow-slate-300/50 shadow-2xl sm:border-x-2 border-slate-200">
        
        {/* Header */}
        <header className="h-[68px] shrink-0 flex items-center justify-between px-4 border-b-2 border-slate-200 bg-white z-20">
           <div className="flex items-center gap-3">
             <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white border-2", activeModeTheme.primary)} style={{borderColor: `${activeModeTheme.shadowHex}40`}}>
                {mode && MODES[mode] ? (() => { const Icon = MODES[mode].icon; return <Icon className="w-4 h-4" />; })() : <Heart className="w-4 h-4 fill-current" />}
             </div>
             <div className={cn("font-extrabold text-xl tracking-tighter", activeModeTheme.textLight)}>humaira</div>
           </div>
           
           <div className="flex items-center gap-5">
             <div className="flex items-center gap-1.5 text-amber-500 font-extrabold tracking-tight text-lg">
               <svg className="w-[22px] h-[22px] fill-current" viewBox="0 0 24 24"><path d="M11.66 22a7.1 7.1 0 01-4.78-2 6.54 6.54 0 01-2-4.52c0-1.87.69-3.4 1.76-5A19.46 19.46 0 019 7.73a34.78 34.78 0 012.28-4s.22-.38.56-.25a.51.51 0 01.35.45A17.43 17.43 0 0013.43 10c0 .92-.3 1.76-.79 2.5a5.52 5.52 0 00-.73 3 1.34 1.34 0 001.21 1.09 1.39 1.39 0 001.4-1.12c.16-1 .28-2.61.16-4.14a.27.27 0 01.24-.29h.06a.28.28 0 01.25.17A8.15 8.15 0 0116 14.54a5.61 5.61 0 01.12 4.14A6.8 6.8 0 0113.3 22h-1.64z"/></svg>
               <span>1</span>
             </div>
             <div className="flex items-center gap-1.5 text-red-500 font-extrabold tracking-tight text-lg">
               <Heart className="w-[22px] h-[22px] fill-current stroke-none" />
               <span>5</span>
             </div>
           </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col bg-slate-50">
          
          {currentView === "settings" && (
            <div className="flex-1 overflow-y-auto px-5 py-6">
              
              <div className="text-center mb-6">
                 <h2 className="text-2xl font-extrabold text-slate-700">প্রোফাইল</h2>
              </div>

              {/* User Gamification & Info Section */}
              <div className="bg-white rounded-[24px] border-2 border-slate-200 p-5 pt-8 mb-6 flex flex-col items-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-20 bg-[#1cb0f6]/10"></div>
                
                <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-50 flex items-center justify-center overflow-hidden mb-4 z-10">
                    {userProfilePic ? <img src={userProfilePic} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
                    <label className="absolute bottom-0 inset-x-0 h-8 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                </div>
                
                <h2 className="text-xl font-extrabold text-slate-700 z-10">{userName}</h2>
                <p className="text-slate-400 font-bold text-sm mb-6 z-10">যোগ দিয়েছেন: মে ২০২৬</p>

                <div className="w-full grid grid-cols-2 gap-4 z-10">
                    <div className="rounded-[16px] border-2 border-amber-200 bg-amber-50 p-4 flex flex-col items-center gap-1">
                        <Flame className="w-8 h-8 text-amber-500 fill-amber-500" />
                        <span className="font-extrabold text-amber-600 text-[22px]">১২</span>
                        <span className="text-amber-500/80 font-bold text-xs uppercase tracking-widest text-center mt-1">দিনের স্ট্রিক</span>
                    </div>
                    <div className="rounded-[16px] border-2 border-[#1cb0f6]/20 bg-[#1cb0f6]/10 p-4 flex flex-col items-center gap-1">
                        <Zap className="w-8 h-8 text-[#1cb0f6] fill-[#1cb0f6]" />
                        <span className="font-extrabold text-[#1cb0f6] text-[22px]">১,২৫০</span>
                        <span className="text-[#1cb0f6]/80 font-bold text-xs uppercase tracking-widest text-center mt-1">মোট এক্সপি</span>
                    </div>
                </div>
              </div>

              {/* Achievements Section */}
              <div className="mb-8">
                  <div className="flex items-center justify-between mb-4 px-1">
                      <h3 className="text-slate-700 font-extrabold text-lg">অর্জনসমূহ</h3>
                      <button className="text-[#1cb0f6] font-bold text-sm uppercase tracking-wider">সব দেখুন</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 shrink-0 px-1 snap-x no-scrollbar">
                      <div className="min-w-[124px] rounded-[20px] border-2 border-slate-200 bg-white p-4 flex flex-col items-center gap-3 snap-center shadow-sm">
                          <div className="w-[52px] h-[52px] rounded-full bg-amber-100 flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-amber-500" />
                          </div>
                          <span className="font-bold text-slate-700 text-sm text-center leading-tight">প্রথম চ্যাট</span>
                      </div>
                      <div className="min-w-[124px] rounded-[20px] border-2 border-slate-200 bg-white p-4 flex flex-col items-center gap-3 snap-center shadow-sm">
                          <div className="w-[52px] h-[52px] rounded-full bg-rose-100 flex items-center justify-center">
                              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                          </div>
                          <span className="font-bold text-slate-700 text-sm text-center leading-tight">বিশ্বস্ত সঙ্গী</span>
                      </div>
                      <div className="min-w-[124px] rounded-[20px] border-2 border-slate-200 bg-white p-4 flex flex-col items-center gap-3 snap-center relative shadow-sm opacity-60">
                          <div className="w-[52px] h-[52px] rounded-full bg-slate-100 flex items-center justify-center">
                              <Lock className="w-6 h-6 text-slate-400" />
                          </div>
                          <span className="font-bold text-slate-500 text-sm text-center leading-tight">৩০ দিনের স্ট্রিক</span>
                          <div className="absolute inset-0 bg-white/10 rounded-[20px]"></div>
                      </div>
                  </div>
              </div>

              
              {/* Daily Goals Section */}
              <div className="mb-8">
                  <div className="flex items-center justify-between mb-4 px-1">
                      <h3 className="text-slate-700 font-extrabold text-lg">দিনের লক্ষ্য</h3>
                  </div>
                  <div className="space-y-3 px-1">
                      <div className="bg-white rounded-[20px] border-2 border-slate-200 p-4 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] shrink-0 rounded-full bg-[#1cb0f6]/10 flex items-center justify-center">
                                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#1cb0f6]" />
                              </div>
                              <div className="flex flex-col gap-1">
                                  <span className="font-extrabold text-slate-700 text-sm sm:text-[15px]">১০টি মেসেজ পাঠান</span>
                                  <div className="flex items-center gap-3 mt-0.5">
                                      <div className="w-[80px] sm:w-[120px] bg-slate-100 h-3 rounded-full overflow-hidden">
                                          <div className="bg-[#1cb0f6] w-[60%] h-full rounded-full"></div>
                                      </div>
                                      <span className="font-extrabold text-slate-400 text-xs">৬/১০</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="bg-white rounded-[20px] border-2 border-slate-200 p-4 flex items-center justify-between shadow-sm opacity-70">
                          <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] shrink-0 rounded-full bg-amber-100 flex items-center justify-center">
                                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                              </div>
                              <div className="flex flex-col gap-1">
                                  <span className="font-extrabold text-slate-700 text-sm sm:text-[15px]">স্ট্রিক বজায় রাখুন</span>
                                  <span className="font-bold text-slate-400 text-[11px] sm:text-xs">আজকের লগইন সম্পূর্ণ</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

{/* Preferences Section */}
              <div className="mb-4 px-1">
                <h3 className="text-slate-700 font-extrabold text-lg">সেটিংস</h3>
              </div>
              <div className="bg-white rounded-[24px] border-2 border-slate-200 overflow-hidden space-y-0 flex flex-col mb-8 shadow-sm">
                  
                  <div className="p-5 border-b-2 border-slate-100 flex flex-col gap-2">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">নাম</label>
                      <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-100 border-2 border-transparent rounded-[16px] px-4 py-3 font-extrabold text-slate-700 focus:bg-white focus:border-[#1cb0f6] outline-none transition-all placeholder:text-slate-300" placeholder="আপনার নাম" />
                  </div>

                  <div className="p-5 border-b-2 border-slate-100 flex flex-col gap-2">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">Love Language</label>
                      <div className="relative">
                          <select value={loveLanguage} onChange={e => setLoveLanguage(e.target.value)} className="w-full bg-slate-100 border-2 border-transparent rounded-[16px] px-4 py-3 font-extrabold text-slate-700 focus:bg-white focus:border-[#1cb0f6] outline-none transition-all appearance-none cursor-pointer">
                              <option>Words of Affirmation</option>
                              <option>Quality Time</option>
                              <option>Receiving Gifts</option>
                              <option>Acts of Service</option>
                              <option>Physical Touch</option>
                          </select>
                          <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                  </div>

                  <div className="p-5 border-b-2 border-slate-100 flex flex-col gap-2">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">Anniversary Date</label>
                      <input type="date" value={anniversaryDate} onChange={e => setAnniversaryDate(e.target.value)} className="w-full bg-slate-100 border-2 border-transparent rounded-[16px] px-4 py-3 font-extrabold text-slate-700 focus:bg-white focus:border-[#1cb0f6] outline-none transition-all cursor-pointer" />
                  </div>
                  
                  <div className="p-5 flex flex-col gap-3">
                      <label className="text-slate-400 font-extrabold text-[11px] uppercase tracking-widest block pl-1">থিম</label>
                      <div className="flex gap-3">
                          <button onClick={() => setTheme("light")} className={cn("flex-1 py-3.5 rounded-[16px] border-2 font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95", theme === "light" ? "bg-[#1cb0f6]/10 border-[#1cb0f6] text-[#1cb0f6]" : "border-slate-200 text-slate-400 bg-white hover:bg-slate-50")}>
                              <Sun className="w-5 h-5" /> লাইট
                          </button>
                          <button onClick={() => setTheme("dark")} className={cn("flex-1 py-3.5 rounded-[16px] border-2 font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95", theme === "dark" ? "bg-[#1cb0f6]/10 border-[#1cb0f6] text-[#1cb0f6]" : "border-slate-200 text-slate-400 bg-white hover:bg-slate-50")}>
                              <Moon className="w-5 h-5" /> ডার্ক
                          </button>
                      </div>
                  </div>

              </div>
              
              <button onClick={() => setCurrentView("home")} className="w-full bg-white text-slate-400 hover:text-red-500 font-extrabold text-[15px] uppercase tracking-widest py-4 border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-[20px] transition-all flex items-center justify-center gap-2 mb-4 active:scale-95 outline-none">
                  <LogOut className="w-5 h-5" /> লগ আউট
              </button>

            </div>
          )}

          {currentView === "prompts" && (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-center">
              <h2 className="text-[22px] sm:text-2xl font-extrabold text-slate-700 mb-1">খসড়া মোড</h2>
              <p className="text-slate-400 font-bold mb-4 sm:mb-6 text-[13px] sm:text-sm leading-snug">হুমায়রার জন্য একটি মোড বেছে নিন। এটি পুরো অ্যাপের থিম এবং তার স্বভাবে পরিবর্তন আনবে!</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-auto mb-auto">
                {(Object.entries(MODES) as [Mode, any][]).map(([key, modeData]) => {
                   const isSelected = mode === key;
                   return (
                     <button
                        key={key} 
                        onClick={() => { setMode(key as Mode); setCurrentView("home"); }}
                        className={cn(
                          "relative rounded-[16px] sm:rounded-[20px] border-2 overflow-hidden flex flex-col transition-all active:scale-95 group shadow-sm hover:shadow-md h-full",
                          isSelected 
                            ? `${modeData.theme.lightBg} ${modeData.theme.primaryBorder}` 
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                        style={isSelected ? { outline: `2px solid ${modeData.theme.shadowHex}`, outlineOffset: '2px' } : {}}
                     >
                        <div className="w-full h-[90px] sm:h-[110px] bg-slate-100 flex-shrink-0 relative overflow-hidden">
                           <img src={modeData.image} alt={modeData.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                           {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md z-10">
                                 <Sparkles className={cn("w-3.5 h-3.5", modeData.theme.textLight)} />
                              </div>
                           )}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-2 sm:p-3 w-full flex-grow flex items-center justify-center border-t-2 border-slate-100/50">
                           <h3 className={cn("font-extrabold text-[13px] sm:text-[15px] leading-tight", isSelected ? modeData.theme.textLight : "text-slate-700")}>{modeData.label}</h3>
                        </div>
                     </button>
                   );
                })}
              </div>
            </div>
          )}

          {currentView === "home" && (
             <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col items-center">
                <div className={cn("w-32 h-32 rounded-[32px] flex items-center justify-center mb-8 relative border-4 border-white", activeModeTheme.primary)} style={{ boxShadow: `0 8px 0 ${activeModeTheme.shadowHex}`}}>
                   {mode && MODES[mode] ? (() => { const Icon = MODES[mode].icon; return <Icon className="w-16 h-16 text-white" />; })() : <Heart className="w-16 h-16 text-white fill-current" />}
                   <div className="absolute -right-3 -top-3 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center animate-bounce shadow-sm text-amber-500 font-bold text-xs"><Sparkles className="w-4 h-4 fill-current"/></div>
                </div>
                <h2 className="text-[26px] font-extrabold text-slate-700 text-center mb-2">হ্যালো {userName}!</h2>
                <p className="text-slate-400 font-bold text-center mb-8 px-4 leading-relaxed">আজ হুমায়রার সাথে জমিয়ে আড্ডা দিতে প্রস্তুত?</p>
                
                <button onClick={() => { if(mode) { createNewChat(); setCurrentView("chat"); } else { setCurrentView("prompts"); } }} className={cn("w-full text-white font-extrabold text-[15px] uppercase tracking-widest py-4 border-b-[4px] rounded-[20px] active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 mb-8", mode ? `${activeModeTheme.primary} ${activeModeTheme.primaryBorder}` : "bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed")}>
                   {mode ? "আড্ডা শুরু করুন" : "আগে একটি মোড সিলেক্ট করুন"}
                </button>
                
                <div className="w-full mb-10">
                  <div className="flex items-center justify-between mb-4 px-1">
                     <h3 className="text-slate-400 font-extrabold uppercase tracking-widest text-xs">আগের আড্ডাগুলো</h3>
                  </div>
                  <div className="space-y-3">
                     {chats.slice(0, 5).map(chat => (
                        <button key={chat.id} onClick={() => { setActiveChatId(chat.id); setCurrentView("chat"); }} className="w-full text-left bg-white border-2 border-slate-200 p-4 rounded-[20px] hover:bg-slate-50 active:scale-[0.98] transition-all outline-none flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-[16px] bg-sky-100 flex items-center justify-center text-sky-500">
                                <MessageCircle className="w-6 h-6 stroke-[2.5]" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-700 text-base line-clamp-1">{chat.title}</span>
                                <span className="text-xs font-bold text-slate-400 mt-0.5 uppercase">{chat.createdAt.toLocaleDateString()}</span>
                              </div>
                           </div>
                           <ChevronRight className="w-6 h-6 text-slate-300" />
                        </button>
                     ))}
                     {chats.length === 0 && <div className="text-center text-slate-400 font-bold py-6 px-4 border-2 border-dashed border-slate-200 rounded-[20px]">কোনো আড্ডা নেই</div>}
                  </div>
                </div>
             </div>
          )}

          {currentView === "chat" && (
            <div className="flex-1 flex flex-col relative w-full h-full bg-white">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {(!activeChat || activeChat.messages.length === 0) && !isGenerating && (
                  <div className="flex flex-col items-center justify-center h-48 mt-10">
                     <div className="w-[88px] h-[88px] bg-slate-100 rounded-[24px] border-2 border-slate-200 flex items-center justify-center text-slate-300 mb-5 animate-[bounce_2s_infinite]">
                        <Heart className="w-11 h-11 fill-current" />
                     </div>
                     <span className="font-extrabold text-slate-400 text-lg">হুমায়রাকে হ্যালো বলুন!</span>
                  </div>
                )}
                
                {activeChat?.messages.map((m) => (
                  <div key={m.id} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && (
                       <div className={cn("w-11 h-11 rounded-full border-2 shadow-sm shrink-0 mr-3 self-end flex items-center justify-center text-white overflow-hidden relative", activeModeTheme.primaryBorder, activeModeTheme.primary)}>
    {mode && MODES[mode] ? (() => { const Icon = MODES[mode].icon; return <Icon className="w-6 h-6" />; })() : <Heart className="w-6 h-6" />}
</div>
                    )}
                    
                    <div className={cn("max-w-[75%] relative flex flex-col", m.role === "user" ? "order-1 items-end" : "order-2 items-start")}>
                       <div className={cn("px-5 py-4 rounded-[20px] font-bold text-[16px] leading-[1.6] relative z-10 border-2", 
                         m.role === "user" 
                           ? `${activeModeTheme.primary} ${activeModeTheme.primaryBorder} text-white rounded-br-[4px]` 
                           : "bg-white text-slate-700 border-slate-200 rounded-bl-[4px]"
                       )}>
                          {m.role === "assistant" ? (
                            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: parseThinkingAndSteps(m.content).html }} />
                          ) : (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          )}
                       </div>
                    </div>
                    {m.role === "user" && (
                       <div className="w-11 h-11 rounded-full border-2 border-slate-200 shadow-sm shrink-0 ml-3 self-end flex items-center justify-center bg-slate-100 text-slate-400 overflow-hidden relative order-3">
                          {userProfilePic ? <img src={userProfilePic} alt="User" className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                       </div>
                    )}
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex w-full justify-start mt-4">
                     <div className="w-11 h-11 rounded-full border-2 border-slate-200 shadow-sm shrink-0 mr-3 self-end flex items-center justify-center bg-[#58cc02] text-white overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256&h=256" alt="A" className="w-full h-full object-cover" />
                     </div>
                     <div className="max-w-[75%]">
                       <div className="px-5 py-4 rounded-[20px] rounded-bl-[4px] border-2 border-slate-200 bg-white text-slate-400 font-bold flex items-center gap-1.5 h-[58px]">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{animationDelay: "0ms"}}/>
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{animationDelay: "150ms"}}/>
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{animationDelay: "300ms"}}/>
                       </div>
                     </div>
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="p-4 bg-white border-t-2 border-slate-200 shrink-0">
                <div className="flex gap-3 items-end">
                   <div className="flex-1 bg-slate-100 border-2 border-slate-200 rounded-[20px] flex items-end focus-within:bg-white focus-within:border-[#1cb0f6] transition-colors">
                     <textarea
                       ref={textareaRef}
                       rows={1}
                       value={inputValue}
                       onChange={(e) => {
                         handleInputChange(e);
                         e.target.style.height = "auto";
                         e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                       }}
                       onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); handleSendMessage(); } }}
                       placeholder={mode ? "হুমায়রাকে মেসেজ দিন..." : "আগে একটি মোড সিলেক্ট করুন..."} disabled={!mode}
                       className="w-full bg-transparent px-4 py-3 placeholder-slate-400 text-slate-700 font-extrabold outline-none resize-none max-h-32 text-base"
                     />
                   </div>
                   {isGenerating ? (
                      <button onClick={() => abortControllerRef.current?.abort()} className="w-[52px] h-[52px] shrink-0 bg-slate-200 text-slate-500 rounded-[16px] flex items-center justify-center font-bold border-b-[4px] border-slate-300 active:border-b-0 active:translate-y-[4px] outline-none transition-all">
                         <Square className="w-6 h-6 fill-current rounded-[4px]" />
                      </button>
                   ) : (
                      <button onClick={() => handleSendMessage()} disabled={!inputValue.trim()} className={cn("w-[52px] h-[52px] shrink-0 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 disabled:translate-y-[4px] disabled:border-b-0 text-white rounded-[16px] flex items-center justify-center font-bold border-b-[4px] active:border-b-0 active:translate-y-[4px] outline-none transition-all", activeModeTheme.primary, activeModeTheme.primaryBorder)}> 
                         <Send className="w-5 h-5 ml-1" />
                      </button>
                   )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="h-[76px] shrink-0 border-t-2 border-slate-200 bg-white flex items-center justify-around px-2 z-30">
           <button onClick={() => setCurrentView("home")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "home" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <Layers className={cn("w-[26px] h-[26px]", currentView === "home" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">শিখুন</span>
           </button>
           <button onClick={() => setCurrentView("chat")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "chat" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <MessageCircle className={cn("w-[26px] h-[26px]", currentView === "chat" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">চ্যাট</span>
           </button>
           <button onClick={() => setCurrentView("prompts")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "prompts" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <Sparkles className={cn("w-[26px] h-[26px]", currentView === "prompts" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">মোড</span>
           </button>
           <button onClick={() => setCurrentView("settings")} className={cn("flex flex-col items-center gap-1 w-[80px] p-2 rounded-2xl border-2 border-transparent transition-all", currentView === "settings" ? activeModeTheme.activeNav : "text-slate-400 hover:bg-slate-50")}>
              <User className={cn("w-[26px] h-[26px]", currentView === "settings" && "fill-current opacity-20")} />
              <span className="text-[10px] uppercase tracking-widest font-extrabold mt-1">প্রোফাইল</span>
           </button>
        </nav>

        <style>{`
          .markdown-content p { margin-bottom: 0.75rem; }
          .markdown-content p:last-child { margin-bottom: 0; }
          .markdown-content h1, .markdown-content h2, .markdown-content h3 { font-family: 'Nunito', sans-serif; font-weight: 900; margin: 1rem 0 0.5rem; line-height: 1.2; color: #334155;}
          .markdown-content strong { font-weight: 800; color: inherit; }
          .markdown-content code { background: rgba(0,0,0,0.05); padding: 0.2rem 0.4rem; border-radius: 8px; font-family: monospace; font-weight: 700; color: #1cb0f6; }
          ::-webkit-scrollbar { width: 0px; }
        `}</style>
      </div>
    </div>
  );
}
