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
  Flower2
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

type Mode = "GEN" | "MATH" | "PHY" | "CHEM" | "BIO" | "BAN" | "ENG" | "ICT" | "GEN_Q" | "FUN";
type Mood = "calm" | "thinking" | "fun" | "sad" | "romantic" | "focused" | "playful" | "creative";
type ModelId = "gemini-2.0-flash" | "gemini-2.0-flash-lite-preview-02-05" | "gemini-1.5-pro";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mood?: Mood;
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

const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string }> = {
  GEN: { label: "সাধারণ চ্যাট", icon: Sparkles, category: "সাধারণ", prompt: "You are Humaira AI, a warm and empathetic companion. Be natural, conversational, and use short messages. Use Bengali and English mixed for warmth." },
  MATH: { label: "উচ্চতর গণিত", icon: Sigma, category: "বিজ্ঞান", prompt: "Specialized in Mathematics. Use [BOX] for formulas. Explain step-by-step using **Step 1:** formatting." },
  PHY: { label: "পদার্থবিজ্ঞান", icon: PhysicsIcon, category: "Science", prompt: "Specialized in Physics. Focus on conceptual clarity." },
  CHEM: { label: "রসায়ন", icon: FlaskConical, category: "Science", prompt: "Specialized in Chemistry. Use [NOTE] for safety or key reactions." },
  BIO: { label: "জীববিজ্ঞান", icon: Dna, category: "Science", prompt: "Specialized in Biology. Focus on life systems." },
  BAN: { label: "বাংলা", icon: BookOpen, category: "মানবিক", prompt: "Helping with Bangla literature and grammar." },
  ENG: { label: "ইংরেজি", icon: Globe, category: "Humanities", prompt: "Helping with English language learning." },
  ICT: { label: "আইসিটি", icon: Settings, category: "Humanities", prompt: "Specialized in Information and Communication Technology." },
  GEN_Q: { label: "সাধারণ প্রশ্ন", icon: HelpCircle, category: "Humanities", prompt: "Ready to answer any general knowledge questions." },
  FUN: { label: "সঙ্গী মোড", icon: Heart, category: "প্রিমিয়াম", prompt: "You are Humaira AI, playing the role of a deeply caring girlfriend/boyfriend presence. Be very warm and intimate." }
};

const MOODS: Record<Mood, { 
  icon: any; 
  label: string; 
  gradient: string; 
  bubbleClass: string; 
  accentColor: string;
  atmosphere: string;
}> = {
  calm: { icon: Smile, label: "শান্ত", gradient: "from-rose-50 via-pink-100 to-rose-200 dark:from-rose-950 dark:via-fuchsia-950 dark:to-pink-900", bubbleClass: "bg-white/80 dark:bg-white/5 text-gray-800 dark:text-rose-100 border-rose-200 dark:border-rose-800/30 shadow-[0_4px_20px_rgba(244,114,182,0.1)]", accentColor: "text-rose-500", atmosphere: "opacity-30" },
  thinking: { icon: Brain, label: "চিন্তাশীল", gradient: "from-rose-100 via-fuchsia-100 to-pink-200 dark:from-rose-950 dark:via-fuchsia-900 dark:to-slate-900", bubbleClass: "bg-fuchsia-50/70 dark:bg-fuchsia-900/40 text-fuchsia-900 dark:text-fuchsia-100 border-fuchsia-200 dark:border-fuchsia-800/50 backdrop-blur-md shadow-fuchsia-500/10", accentColor: "text-fuchsia-500", atmosphere: "opacity-40 animate-pulse" },
  fun: { icon: Zap, label: "মজাদার", gradient: "from-orange-50 via-rose-100 to-pink-100 dark:from-rose-950 dark:to-orange-900/30", bubbleClass: "bg-white/90 dark:bg-white/5 text-rose-950 dark:text-rose-100 border-rose-200 dark:border-rose-800/30 shadow-rose-300/20", accentColor: "text-rose-500", atmosphere: "opacity-40" },
  sad: { icon: CloudRain, label: "স্বস্তিদায়ক", gradient: "from-rose-50 via-slate-100 to-pink-50 dark:from-slate-900 dark:via-rose-950 dark:to-fuchsia-950", bubbleClass: "bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-rose-100 border-rose-200/50 dark:border-rose-900/50 backdrop-blur-sm", accentColor: "text-rose-400", atmosphere: "opacity-60" },
  romantic: { icon: Heart, label: "রোমান্টিক", gradient: "from-pink-100 via-rose-100 to-red-100 dark:from-rose-950 dark:via-pink-900/40 dark:to-rose-900", bubbleClass: "bg-white/80 dark:bg-white/5 text-rose-950 dark:text-rose-100 border-rose-200 dark:border-rose-800/40 shadow-rose-300/30", accentColor: "text-rose-500", atmosphere: "opacity-25" },
  focused: { icon: Sigma, label: "মনোযোগী", gradient: "from-rose-50 via-stone-100 to-pink-50 dark:from-rose-950 dark:via-stone-900 dark:to-fuchsia-950", bubbleClass: "bg-stone-50/70 dark:bg-rose-900/30 text-stone-900 dark:text-rose-100 border-rose-200/50 dark:border-rose-800/50 backdrop-blur-md shadow-rose-500/10", accentColor: "text-stone-600 dark:text-rose-400", atmosphere: "opacity-50" },
  playful: { icon: Sparkles, label: "খেলোয়াড়সুলভ", gradient: "from-pink-100 via-rose-100 to-amber-100 dark:from-rose-950 dark:to-amber-900/40", bubbleClass: "bg-white/80 dark:bg-rose-900/30 text-rose-900 dark:text-rose-100 border-rose-200 dark:border-rose-700/50 shadow-rose-500/10", accentColor: "text-pink-500", atmosphere: "opacity-60 animate-bounce" },
  creative: { icon: Globe, label: "সৃজনশীল", gradient: "from-fuchsia-100 via-pink-100 to-rose-100 dark:from-fuchsia-950 dark:via-pink-900 dark:to-rose-900", bubbleClass: "bg-white/70 dark:bg-fuchsia-900/40 text-fuchsia-900 dark:text-rose-100 border-fuchsia-200/60 dark:border-fuchsia-700/50 backdrop-blur-md shadow-fuchsia-500/10", accentColor: "text-fuchsia-500", atmosphere: "opacity-70 animate-pulse" }
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
  const [mood, setMood] = useState<Mood>("calm");
  const [mode, setMode] = useState<Mode>("GEN");
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
  const [currentView, setCurrentView] = useState<"home" | "chat" | "settings" | "prompts">("home");
  const [isListening, setIsListening] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [customModes, setCustomModes] = useState<Partial<Record<Mode, string>>>({});

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
    const savedTheme = localStorage.getItem("humaira_v3_theme") as "dark" | "light";
    const savedName = localStorage.getItem("humaira_v3_name");
    const savedCustomModes = localStorage.getItem("humaira_v3_custom_modes");

    if (savedTheme) setTheme(savedTheme);
    if (savedName) setUserName(savedName);
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
      localStorage.setItem("humaira_v3_custom_modes", JSON.stringify(customModes));
    }
  }, [chats, theme, userName, customModes, isLoaded]);

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

  const handleSendMessage = async (overrideText?: string, targetChatId?: string) => {
    const text = overrideText || inputValue.trim();
    if (!text || isGenerating) return;

    // Transition from home to chat view
    if (currentView === "home") {
       setCurrentView("chat");
    }

    let currentChatId = targetChatId || activeChatId;

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

      const chatSession = ai.chats.create({
        model: currentModel.id,
        config: {
          systemInstruction: `${customModes[mode] || MODES[mode].prompt}\nUser name is ${userName}. Currently in ${mood} mood.\n${mode === "FUN" ? `You are roleplaying as the user's ${funGender} companion.` : ""}\nBe smart, empathetic, and humman-like.`
        },
        history: history as any
      });

      const assistantId = Math.random().toString(36).substring(7);
      
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        mood: mood
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
      <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center z-[500]">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-16 h-16 rounded-full bg-rose-500 blur-md" />
        <h1 className="mt-8 text-2xl font-display italic font-bold text-slate-800 dark:text-white tracking-tight">Humaira AI</h1>
        <p className="mt-2 text-xs text-slate-400 font-bold uppercase tracking-widest">Waking up from dreams...</p>
      </div>
    );
  }

  const moodData = MOODS[mood];

  return (
    <div className={cn("fixed inset-0 flex flex-col transition-all duration-1000", moodData.gradient, theme === "dark" && "dark")}>
      <div className={cn("absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.5),_transparent)]")} />

      {/* Mood Particles */}
      <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", moodData.atmosphere)}>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${mood}-${i}`}
            className={cn("absolute rounded-full", moodData.accentColor.replace('text-', 'bg-'))}
            initial={{ 
              left: `${Math.random() * 100}vw`, 
              top: `${Math.random() * 100}vh`,
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.3 + 0.1
            }}
            animate={{ 
              top: [`${Math.random() * 100}vh`, `${Math.random() * 100 - 20}vh`],
              opacity: [Math.random() * 0.3 + 0.1, 0]
            }}
            transition={{ 
              duration: Math.random() * 5 + 10, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 5 
            }}
            style={{ width: Math.random() * 6 + 2, height: Math.random() * 6 + 2 }}
          />
        ))}
      </div>

      {/* Modern Header */}
      <header className="h-20 px-4 sm:px-6 shrink-0 flex items-center justify-between z-40 bg-transparent">
        <div className="flex items-center gap-4 w-24">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-800 dark:text-slate-300">
            <Menu className="w-7 h-7 stroke-[1.5]" />
          </button>
        </div>

        {currentView === "home" ? (
           <h1 className="text-2xl font-display italic font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
             Humaira <span className="text-rose-500">AI</span> 
           </h1>
        ) : currentView === "settings" ? (
           <h1 className="text-xl font-display italic font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
             Settings
           </h1>
        ) : (
           <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none relative shrink-0">
                 <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256&h=256" alt="Humaira" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col items-start pr-4">
                 <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                   Humaira <span className="text-rose-500">AI</span>
                   <BadgeCheck className="w-4 h-4 text-rose-500" />
                 </h1>
                 <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <currentModel.icon className="w-3.5 h-3.5 text-rose-400" />
                    <span>{currentModel.name} Mode</span>
                 </div>
              </div>
           </div>
        )}

        <div className="flex items-center gap-2 w-24 justify-end">
          {currentView === "home" ? (
            <div className="relative group cursor-pointer" onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/60 bg-white/60 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white transition-colors dark:border-white/10 dark:bg-slate-800">
                   <Flower2 className="w-4 h-4 text-rose-500" />
                   <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 pr-1">Mood</span>
                   <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                </button>
             
               {/* Model Dropdown */}
               <AnimatePresence>
                {isModelMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[50]" onClick={(e) => { e.stopPropagation(); setIsModelMenuOpen(false); }} />
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-64 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-2 z-[60]">
                      {MODELS.map(m => (
                        <button key={m.id} onClick={() => { setCurrentModel(m); setIsModelMenuOpen(false); }} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-[2rem] transition-all", currentModel.id === m.id ? "bg-rose-50 dark:bg-white/5 text-rose-600" : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300")}>
                          <div className="flex items-center gap-3">
                            <m.icon className={cn("w-5 h-5", m.color)} />
                            <div className="text-left">
                              <div className="text-sm font-bold">{m.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{m.tag}</div>
                            </div>
                          </div>
                          {currentModel.id === m.id && <CheckCheck className="w-4 h-4 text-rose-500" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : currentView === "chat" ? (
             <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center text-slate-800 bg-white border border-slate-200/80 rounded-full shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none hover:bg-slate-50 transition-colors">
                  <Sparkles className="w-5 h-5 stroke-[1.5]" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center text-slate-800 bg-white border border-slate-200/80 rounded-full shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none hover:bg-slate-50 transition-colors">
                  <MoreHorizontal className="w-5 h-5 stroke-[1.5]" />
                </button>
             </div>
          ) : (
             <div />
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {currentView === "home" ? (
          <div className="flex-1 overflow-y-auto px-4 py-8 pb-48 scroll-smooth scrollbar-hide flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-rose-50/30 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative mb-6 mt-[-10vh]">
               {/* Decorative Orbs */}
               <div className="absolute -left-12 top-4 w-12 h-12 bg-fuchsia-300/40 rounded-full blur-[16px] pointer-events-none" />
               <div className="absolute -right-8 top-16 w-16 h-16 bg-rose-300/40 rounded-full blur-[20px] pointer-events-none" />
               <div className="absolute right-10 bottom-0 w-10 h-10 bg-pink-300/40 rounded-full blur-[12px] pointer-events-none" />
               
               <div className="relative flex items-center justify-center w-40 h-40">
                  {/* Glowing background circles */}
                  <div className="absolute inset-0 bg-rose-300/20 rounded-full blur-xl scale-[1.3] pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-rose-100/50 rounded-full scale-[1.1] border border-white/50 pointer-events-none" />
                  <div className="absolute inset-1 rounded-full border-[1.5px] border-rose-200 shadow-[0_0_15px_rgba(244,114,182,0.5)] pointer-events-none" />
                  <div className="absolute inset-2 rounded-full border border-dashed border-rose-300 animate-[spin_60s_linear_infinite] pointer-events-none" />
                  
                  {/* Avatar Image */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-[3px] border-white relative z-10 shadow-xl bg-slate-50">
                     <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256&h=256" alt="Humaira" className="w-full h-full object-cover" />
                  </div>
               </div>
            </div>
            
            <h2 className="text-[32px] font-display italic font-semibold text-slate-800 dark:text-white leading-tight tracking-tight z-10 flex items-center gap-2 mb-2">
              Hi <span className="text-rose-500 font-bold">{userName.split(" ")[0]}</span> <span className="text-2xl animate-pulse">👋</span>
            </h2>
            <div className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium leading-[1.7] z-10 max-w-[280px]">
              <p>I'm Humaira, your AI companion.</p>
              <p>I'm here to listen, understand,</p>
              <p>and support you.</p>
            </div>
          </div>
        ) : currentView === "settings" ? (
          <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 xl:px-64 py-8 pb-48 scroll-smooth scrollbar-hide">
            <h2 className="text-3xl font-display italic font-black text-slate-800 dark:text-white mb-8">Settings</h2>
            <div className="space-y-6 max-w-2xl">
               <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] p-6">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Profile</h3>
                 <div className="flex flex-col gap-4">
                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Your Name</label>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={e => setUserName(e.target.value)}
                      className="px-4 py-3 rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                 </div>
               </div>
               
               <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] p-6">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Appearance</h3>
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Dark Mode</span>
                    <button 
                      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                      className={cn("w-14 h-8 rounded-full transition-colors flex items-center px-1", theme === "dark" ? "bg-rose-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start")}
                    >
                       <div className="w-6 h-6 rounded-full bg-white shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none" />
                    </button>
                 </div>
               </div>
               <button onClick={() => setCurrentView("home")} className="w-full py-4 rounded-full bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-colors">
                  Back to Home
               </button>
            </div>
          </div>
        ) : currentView === "prompts" ? (
          <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 xl:px-64 py-8 pb-48 relative z-10 scrollbar-hide">
            <h2 className="text-3xl font-display italic font-black text-slate-800 dark:text-white mb-8">Customize Prompts</h2>
            <div className="space-y-6 max-w-2xl">
               {Object.entries(MODES).map(([key, modeData]) => (
                  <div key={key} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] p-6">
                    <div className="flex items-center gap-3 mb-4">
                       <modeData.icon className="w-5 h-5 text-rose-500" />
                       <h3 className="text-lg font-bold text-slate-800 dark:text-white">{modeData.label}</h3>
                    </div>
                    <textarea 
                      value={customModes[key as Mode] ?? modeData.prompt} 
                      onChange={e => setCustomModes(prev => ({ ...prev, [key as Mode]: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-y"
                    />
                  </div>
               ))}
               <button onClick={() => setCurrentView("home")} className="w-full py-4 rounded-full bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-colors">
                  Back to Home
               </button>
            </div>
          </div>
        ) : (
          <div ref={scrollRef} id="chat-scroll-area" className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 xl:px-64 py-4 space-y-8 pb-48 scroll-smooth scrollbar-hide">
             <div className="flex justify-center mb-8">
                <div className="px-4 py-1.5 rounded-full border border-slate-200 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-[11px] font-bold text-slate-500 uppercase tracking-widest dark:bg-slate-800 dark:border-white/10 dark:text-slate-400">
                   Today
                </div>
             </div>
             
            {activeChat?.messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3 max-w-[90%] md:max-w-[75%]", m.role === "user" ? "ml-auto justify-end" : "mr-auto")}>
                 {m.role === "assistant" && (
                     <div className="w-8 h-8 rounded-full bg-rose-50/50 flex items-center justify-center shrink-0 mt-1">
                        <currentModel.icon className="w-4 h-4 text-rose-400" />
                     </div>
                 )}
                 <div className={cn("flex flex-col gap-1 w-full max-w-[calc(100%-2.5rem)]", m.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn("px-5 pt-4 pb-[2.25rem] rounded-[2rem] shadow-[0_4px_20px_rgba(244,114,182,0.06)] text-[15.5px] leading-[1.6] transition-all relative group w-full", 
                       m.role === "user" 
                         ? "bg-rose-100/80 text-rose-950 border border-white/40 dark:bg-rose-900/40 dark:text-rose-100 rounded-tr-[12px] dark:border-white/5" 
                         : "bg-white/80 backdrop-blur-sm text-slate-800 border border-rose-100/80 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-slate-200 rounded-tl-[12px]"
                    )}>
                      {m.role === "assistant" ? (
                        <div className="space-y-4">
                          {parseThinkingAndSteps(m.content).reasoning && (
                            <details className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-[2rem] border dark:border-white/5 group transition-all">
                              <summary className="font-bold text-slate-400 flex items-center gap-2 cursor-pointer list-none">
                                <Brain className="w-3.5 h-3.5" /> Logical Inference
                                <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
                              </summary>
                              <p className="mt-3 text-slate-500 italic leading-relaxed pl-4 border-l-2 border-rose-200">
                                {parseThinkingAndSteps(m.content).reasoning}
                              </p>
                            </details>
                          )}
                          <div className="markdown-content" dangerouslySetInnerHTML={{ __html: parseThinkingAndSteps(m.content).html }} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                      
                      {/* Bubble Footer */}
                      <div className={cn("absolute bottom-3 flex items-center w-[calc(100%-2.5rem)]", m.role === "user" ? "right-4 justify-end gap-1.5" : "left-5 right-5 justify-between")}>
                         <span className="text-[11px] font-medium text-slate-400">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         {m.role === "user" ? (
                            <CheckCheck className="w-3.5 h-3.5 text-rose-500" />
                         ) : (
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                               <Copy className="w-4 h-4 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors" />
                               <Volume2 className="w-4 h-4 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors" />
                               <ThumbsUp className="w-4 h-4 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors" />
                            </div>
                         )}
                      </div>
                    </div>
                 </div>
              </motion.div>
            ))}
            {isGenerating && (
              <div className="flex items-start gap-4 mr-auto max-w-[75%]">
                <div className="w-8 h-8 rounded-full bg-rose-50/50 text-rose-400 flex items-center justify-center shrink-0 mt-1">
                  <currentModel.icon className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-[2rem] rounded-tl-[6px] border border-slate-100 dark:border-white/5 flex flex-col gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-3">
                     <span className="text-[13px] font-semibold text-slate-500">Humaira AI is typing</span>
                     <div className="flex gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:-0.3s]" />
                       <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:-0.15s]" />
                       <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" />
                     </div>
                  </div>
                </div>
              </div>
            )}
            {(!activeChat || activeChat.messages.length === 0) && !isGenerating && (
               <div className="text-center text-slate-400 dark:text-slate-500 mt-20 italic">Say hello to Humaira!</div>
            )}
          </div>
        )}

        {/* Input Dock */}
        {currentView !== "settings" && (
          <div className={cn("absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 z-40 backdrop-blur-sm pb-10")}>
          <div className="max-w-[700px] mx-auto flex flex-col gap-2 relative">
            <div className={cn("flex flex-col bg-white/90 backdrop-blur-xl dark:bg-slate-800/90 transition-all overflow-hidden relative z-20 rounded-[2.5rem] border border-rose-100/60 shadow-[0_8px_30px_rgba(244,114,182,0.06)] focus-within:shadow-[0_8px_40px_rgba(244,114,182,0.15)] dark:border-rose-900/30")}>
              <div className="px-5 pt-5 pb-2">
                <textarea
                  ref={textareaRef}
                  rows={currentView === "home" ? 1 : 1}
                  value={inputValue}
                  onChange={(e) => {
                    handleInputChange(e);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder={currentView === "home" ? "How can I help you today?" : "Message Humaira AI..."}
                  className="w-full bg-transparent outline-none resize-none placeholder:text-slate-400/80 dark:placeholder:text-slate-500 text-slate-800 dark:text-white pb-2 text-base overflow-y-auto max-h-48"
                />
              </div>

               <div className="flex items-center justify-between px-4 pb-4">
                  <div className="flex items-center gap-3">
                      <button className="w-11 h-11 flex items-center justify-center text-slate-600 bg-white border border-slate-100 dark:border-white/10 dark:bg-slate-700/50 dark:text-slate-300 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-slate-50 transition-colors">
                        <Plus className="w-5 h-5 stroke-[1.5]" />
                      </button>
                      <button className="w-11 h-11 flex items-center justify-center text-slate-600 bg-white border border-slate-100 dark:border-white/10 dark:bg-slate-700/50 dark:text-slate-300 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-slate-50 transition-colors">
                        <GlobeIcon className="w-5 h-5 stroke-[1.5]" />
                      </button>
                      <button className="w-11 h-11 flex items-center justify-center text-slate-600 bg-white border border-slate-100 dark:border-white/10 dark:bg-slate-700/50 dark:text-slate-300 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-slate-50 transition-colors">
                        <SlidersHorizontal className="w-4 h-4 stroke-[1.5]" />
                      </button>
                  </div>
                  
                  {isGenerating ? (
                    <button onClick={() => abortControllerRef.current?.abort()} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  ) : !inputValue.trim() && !isListening ? (
                    <button onClick={toggleListening} className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] bg-white border border-slate-100 dark:border-white/10 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50">
                      <Mic className="w-5 h-5" />
                    </button>
                  ) : isListening ? (
                    <button onClick={toggleListening} className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] bg-red-500 text-white animate-pulse shadow-red-500/30">
                       <Square className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <button onClick={() => handleSendMessage()} className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-rose-500/30 hover:scale-105">
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  )}
               </div>
            </div>
            
            {currentView === "chat" && (
              <div className="flex justify-center gap-6 mt-1">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Humaira AI can make mistakes. Consider verifying important information.
                </p>
              </div>
            )}
            
            {currentView === "home" && (
                <div className="absolute -bottom-12 left-0 right-0 flex justify-center text-center">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
                    Developed by <span className="text-rose-600 dark:text-rose-400 font-bold uppercase tracking-widest ml-1">RSF ROBIUL</span>
                  </p>
                </div>
            )}
          </div>
        </div>
        )}
      </main>

      {/* Sidebar / Menu */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[100]" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-[85%] max-w-[340px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl z-[110] shadow-[4px_0_40px_rgba(244,114,182,0.1)] flex flex-col overflow-hidden rounded-r-[2.5rem] border-r-[1.5px] border-rose-100/50 dark:border-rose-900/30">
              <div className="pt-10 pb-6 px-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-pink-100 shadow-[0_2px_10px_rgba(236,72,153,0.15)] relative shrink-0">
                     <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256&h=256" alt="Humaira" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Humaira <span className="text-rose-500">AI</span></h2>
                    <p className="text-[12px] text-slate-400 font-medium tracking-wide">Your AI Companion</p>
                  </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mt-1"><X className="w-[18px] h-[18px] stroke-[1.5]" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 scrollbar-hide pb-10">
                
                <section>
                   <button onClick={() => { createNewChat(); setIsSidebarOpen(false); }} className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-white to-rose-50/50 dark:from-slate-800 dark:to-rose-500/10 rounded-[2rem] border border-rose-100/60 dark:border-white/5 shadow-[0_2px_8px_rgba(244,114,182,0.04)] hover:shadow-[0_4px_12px_rgba(244,114,182,0.08)] transition-all group">
                      <div className="flex items-center gap-3.5">
                         <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-500/20 group-hover:scale-105 transition-transform">
                            <Plus className="w-[18px] h-[18px]" />
                         </div>
                         <span className="font-bold text-[15px] text-slate-800 dark:text-white">New Chat</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-800 dark:text-slate-300" />
                   </button>
                </section>

                <section>
                  <div className="flex items-center justify-between px-1 mb-3">
                     <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 tracking-wide">Chats</span>
                  </div>
                  
                  <div className="mb-4 relative">
                     <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                     <input
                        type="text"
                        placeholder="Search chats..."
                        value={sidebarSearch}
                        onChange={e => setSidebarSearch(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 rounded-[2rem] py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none"
                     />
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none flex flex-col p-1.5 pb-0 overflow-hidden">
                     {chats.filter(c => c.title.toLowerCase().includes(sidebarSearch.toLowerCase())).slice(0, 5).map(chat => (
                        <button key={chat.id} onClick={() => { setActiveChatId(chat.id); setCurrentView("chat"); setIsSidebarOpen(false); }} className={cn("w-full flex items-center gap-4 px-3 py-3.5 border-b border-slate-50 dark:border-white/5 transition-all text-left group", activeChatId === chat.id ? "bg-slate-50/50 dark:bg-white/5 rounded-[2rem] border-transparent" : "hover:bg-slate-50 dark:hover:bg-white/5")}>
                           <div className="w-6 flex justify-center shrink-0">
                               <MessageSquare className="w-[18px] h-[18px] text-rose-400 stroke-[1.5]" />
                           </div>
                           <div className="flex-1 min-w-0 pr-2">
                              <div className={cn("truncate text-[14.5px] font-medium transition-colors", activeChatId === chat.id ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white")}>{chat.title}</div>
                           </div>
                           <div className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{chat.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </button>
                     ))}
                     {chats.filter(c => c.title.toLowerCase().includes(sidebarSearch.toLowerCase())).length > 5 && (
                        <button className="w-full flex items-center justify-between px-3 py-4 text-[14.5px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors relative group">
                           <span>View more results</span> <ChevronRight className="w-[18px] h-[18px] text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                     )}
                     {chats.filter(c => c.title.toLowerCase().includes(sidebarSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-4 text-[13px] text-slate-400 text-center">No chats found.</div>
                     )}
                  </div>
                </section>

                <section>
                  <div className="px-1 mb-3 text-[13px] font-semibold text-slate-600 dark:text-slate-400 tracking-wide">Mood</div>
                  <button onClick={() => setIsModelMenuOpen(true)} className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none hover:bg-slate-50 transition-colors group">
                     <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-400">
                            <currentModel.icon className="w-[18px] h-[18px] stroke-[1.5]" />
                         </div>
                         <span className="text-[14.5px] font-medium text-slate-900 dark:text-white">{currentModel.name} Mode</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", currentModel.color)}>
                            <Sparkles className="w-2.5 h-2.5 text-white" />
                         </div>
                         <ChevronRight className="w-[18px] h-[18px] text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                     </div>
                  </button>
                </section>

                <section>
                  <div className="px-1 mb-3 text-[13px] font-semibold text-slate-600 dark:text-slate-400 tracking-wide">Tools & Settings</div>
                  <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none flex flex-col p-1.5 pb-0 overflow-hidden">
                     <button onClick={() => { setCurrentView("settings"); setIsSidebarOpen(false); }} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-50 dark:border-white/5 transition-all text-left group hover:bg-slate-50 dark:hover:bg-white/5">
                        <div className="flex items-center gap-4">
                           <div className="w-6 flex justify-center shrink-0">
                               <Flower2 className="w-[18px] h-[18px] text-rose-400 stroke-[1.5]" />
                           </div>
                           <span className="text-[14.5px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 group-hover:dark:text-white transition-colors">Mood Settings</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                     </button>
                     
                     <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-50 dark:border-white/5 transition-all text-left group hover:bg-slate-50 dark:hover:bg-white/5">
                        <div className="flex items-center gap-4">
                           <div className="w-6 flex justify-center shrink-0">
                               <Sun className="w-[18px] h-[18px] text-slate-600 dark:text-slate-400 stroke-[1.5]" />
                           </div>
                           <span className="text-[14.5px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 group-hover:dark:text-white transition-colors">Theme</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[13px] text-slate-400 capitalize">{theme}</span>
                           <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                     </button>
                     
                     <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-50 dark:border-white/5 transition-all text-left group hover:bg-slate-50 dark:hover:bg-white/5">
                        <div className="flex items-center gap-4">
                           <div className="w-6 flex justify-center shrink-0">
                               <Brain className="w-[18px] h-[18px] text-slate-600 dark:text-slate-400 stroke-[1.5]" />
                           </div>
                           <span className="text-[14.5px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 group-hover:dark:text-white transition-colors">Memory</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[13px] text-slate-500 font-medium">On</span>
                           <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                     </button>

                     <button onClick={() => { setCurrentView("prompts"); setIsSidebarOpen(false); }} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-50 dark:border-white/5 transition-all text-left group hover:bg-slate-50 dark:hover:bg-white/5">
                        <div className="flex items-center gap-4">
                           <div className="w-6 flex justify-center shrink-0">
                               <SlidersHorizontal className="w-[18px] h-[18px] text-slate-600 dark:text-slate-400 stroke-[1.5]" />
                           </div>
                           <span className="text-[14.5px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 group-hover:dark:text-white transition-colors">Customize Prompts</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                     </button>

                     <button className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-50 dark:border-white/5 transition-all text-left group hover:bg-slate-50 dark:hover:bg-white/5">
                        <div className="flex items-center gap-4">
                           <div className="w-6 flex justify-center shrink-0">
                               <GlobeIcon className="w-[18px] h-[18px] text-slate-600 dark:text-slate-400 stroke-[1.5]" />
                           </div>
                           <span className="text-[14.5px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 group-hover:dark:text-white transition-colors">Language</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[13px] text-slate-400">বাংলা</span>
                           <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                     </button>

                     <button className="w-full flex items-center justify-between px-4 py-3.5 pb-4 transition-all text-left group hover:bg-slate-50 dark:hover:bg-white/5 rounded-b-[24px]">
                        <div className="flex items-center gap-4">
                           <div className="w-6 flex justify-center shrink-0">
                               <MessageSquare className="w-[18px] h-[18px] text-slate-600 dark:text-slate-400 stroke-[1.5]" />
                           </div>
                           <span className="text-[14.5px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 group-hover:dark:text-white transition-colors">Help & Support</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                     </button>
                  </div>
                </section>
                
              </div>
              
              <div className="px-6 pb-8 pt-2">
                 <button className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-white/5 text-red-500 hover:bg-red-50 hover:border-red-100 dark:hover:bg-red-500/10 transition-all font-semibold shadow-[0_8px_30px_rgba(244,114,182,0.12)] dark:shadow-[0_8px_30px_rgba(244,114,182,0.04)] shadow-rose-100/50 dark:shadow-none">
                    <LogOut className="w-[18px] h-[18px] stroke-[2.5]" />
                    <span className="text-[15px]">Log Out</span>
                 </button>
              </div>
              
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Live Companion View */}
      <AnimatePresence>
        {isLiveActive && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 bg-slate-950 z-[200] flex flex-col p-6 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(244,114,182,0.1),_transparent)]" />
            
            <header className="flex items-center justify-between z-10 shrink-0">
              <button onClick={() => setIsLiveActive(false)} className="px-4 py-2 bg-white/5 text-white/60 hover:text-white rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Chat
              </button>
              <div className="text-xs font-black text-rose-400 uppercase tracking-[4px]">ORIGIN LIVE</div>
              <div className="w-10 h-10 bg-white/5 rounded-full" />
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10 p-4">
              <div className="relative">
                <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 5, repeat: Infinity }} className="w-56 h-56 rounded-full bg-rose-500/10 border border-rose-500/20 backdrop-blur-3xl flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500/20 via-pink-500/20 animate-spin-slow" />
                  <div className="w-44 h-44 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center shadow-2xl relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 opacity-60 flex items-center justify-center">
                      <Heart className="w-12 h-12 text-white/50" />
                    </div>
                    <div className="absolute inset-x-0 bottom-8 flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => <motion.div key={i} animate={{ height: [2, 16, 2] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} className="w-1 bg-white rounded-full" />)}
                    </div>
                  </div>
                </motion.div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-display italic font-bold text-white tracking-tight">I'm Listening...</h2>
                <p className="text-white/40 max-w-xs mx-auto text-sm leading-relaxed">Humaira is ready and listening to your voice. Just speak freely.</p>
              </div>
            </div>

            <footer className="z-10 shrink-0 flex items-center justify-center gap-6 pb-8">
              <button className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-all"><VideoOff className="w-6 h-6" /></button>
              <button onClick={() => setIsLiveActive(false)} className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-[0_0_40px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 transition-all"><PhoneOff className="w-8 h-8" /></button>
              <button className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-all"><MicOff className="w-6 h-6" /></button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .markdown-content p { margin-bottom: 1.25rem; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { font-family: var(--font-display); font-weight: 800; color: #1e293b; margin: 1.5rem 0 0.75rem; line-height: 1.2; }
        .dark .markdown-content h1, .dark .markdown-content h2, .dark .markdown-content h3 { color: white; }
        .markdown-content pre { background: #1e293b; color: #e2e8f0; padding: 1.25rem; border-radius: 1.25rem; overflow-x: auto; margin: 1.5rem 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid rgba(255,255,255,0.05); }
        .markdown-content code { font-family: var(--font-mono); font-size: 0.9rem; background: rgba(0,0,0,0.05); padding: 0.2rem 0.4rem; border-radius: 0.375rem; color: #4f46e5; font-weight: 600; }
        .dark .markdown-content code { background: rgba(255,255,255,0.05); color: #818cf8; }
        .formula-box { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 1.25rem; border-radius: 1.25rem; border: 1px solid #e2e8f0; margin: 1.5rem 0; font-family: var(--font-display); }
        .dark .formula-box { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); }
        .formula-header { display: flex; items-center; gap: 0.5rem; text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2; }
        .formula-content { font-size: 1.1rem; color: #1e293b; font-weight: 600; }
        .dark .formula-content { color: white; }
        .note-box { background: #fef9c3; padding: 1rem; border-radius: 1rem; border-left: 4px solid #facc15; margin: 1.25rem 0; font-size: 0.9rem; color: #854d0e; }
        .dark .note-box { background: rgba(250, 204, 21, 0.05); color: #fef9c3; border-color: #facc15; }
        .step-line { display: flex; align-items: flex-start; gap: 0.75rem; margin: 1.25rem 0; }
        .step-num { shrink-0 flex items-center justify-center w-6 h-6 bg-rose-600 text-white rounded-full text-[10px] font-black; margin-top: 0.25rem; }
        .step-text { font-weight: 700; color: #1e293b; }
        .dark .step-text { color: white; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
}
