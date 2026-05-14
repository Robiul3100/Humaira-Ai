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
  CheckCircle2
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
type Mood = "calm" | "thinking" | "fun" | "sad" | "romantic";
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
  { id: "gemini-2.0-flash", name: "Humaira~ALPHA", tag: "PRO", color: "text-indigo-500", icon: Sparkles },
  { id: "gemini-2.0-flash-lite-preview-02-05", name: "Humaira~LITE", tag: "FAST", color: "text-emerald-500", icon: Zap },
  { id: "gemini-1.5-pro", name: "Humaira~BRAIN", tag: "SMART", color: "text-pink-500", icon: Brain },
];

const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string }> = {
  GEN: { label: "General Chat", icon: Sparkles, category: "General", prompt: "You are Humaira AI, a warm and empathetic companion. Be natural, conversational, and use short messages. Use Bengali and English mixed for warmth." },
  MATH: { label: "Higher Math", icon: Sigma, category: "Science", prompt: "Specialized in Mathematics. Use [BOX] for formulas. Explain step-by-step using **Step 1:** formatting." },
  PHY: { label: "Physics", icon: PhysicsIcon, category: "Science", prompt: "Specialized in Physics. Focus on conceptual clarity." },
  CHEM: { label: "Chemistry", icon: FlaskConical, category: "Science", prompt: "Specialized in Chemistry. Use [NOTE] for safety or key reactions." },
  BIO: { label: "Biology", icon: Dna, category: "Science", prompt: "Specialized in Biology. Focus on life systems." },
  BAN: { label: "Bangla", icon: BookOpen, category: "Humanities", prompt: "Helping with Bangla literature and grammar." },
  ENG: { label: "English", icon: Globe, category: "Humanities", prompt: "Helping with English language learning." },
  ICT: { label: "ICT", icon: Settings, category: "Humanities", prompt: "Specialized in Information and Communication Technology." },
  GEN_Q: { label: "General Q&A", icon: HelpCircle, category: "Humanities", prompt: "Ready to answer any general knowledge questions." },
  FUN: { label: "Companion Mode", icon: Heart, category: "Premium", prompt: "You are Humaira AI, playing the role of a deeply caring girlfriend/boyfriend presence. Be very warm and intimate." }
};

const MOODS: Record<Mood, { 
  icon: any; 
  label: string; 
  gradient: string; 
  bubbleClass: string; 
  accentColor: string;
  atmosphere: string;
}> = {
  calm: { icon: Smile, label: "Calm", gradient: "from-slate-50 via-gray-50 to-zinc-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950", bubbleClass: "bg-white/80 dark:bg-white/5 text-gray-800 dark:text-white border-gray-100 dark:border-white/10 shadow-sm", accentColor: "text-slate-600", atmosphere: "opacity-20" },
  thinking: { icon: Brain, label: "Thinking", gradient: "from-indigo-950 via-blue-900 to-slate-900", bubbleClass: "bg-blue-900/40 text-blue-50 border-blue-800/50 backdrop-blur-md shadow-blue-500/10", accentColor: "text-blue-400", atmosphere: "opacity-40 animate-pulse" },
  fun: { icon: Zap, label: "Fun", gradient: "from-amber-100 via-orange-50 to-rose-100 dark:from-slate-900 dark:to-orange-950/20", bubbleClass: "bg-white/90 dark:bg-white/5 text-orange-950 dark:text-orange-200 border-orange-100 dark:border-orange-900/30 shadow-orange-200/20", accentColor: "text-orange-500", atmosphere: "opacity-30" },
  sad: { icon: CloudRain, label: "Comfort", gradient: "from-zinc-900 via-slate-900 to-gray-900", bubbleClass: "bg-slate-800/60 text-slate-100 border-slate-700/50 backdrop-blur-sm", accentColor: "text-slate-400", atmosphere: "opacity-60" },
  romantic: { icon: Heart, label: "Romantic", gradient: "from-rose-50 via-pink-50 to-red-50 dark:from-slate-900 dark:to-rose-950/30", bubbleClass: "bg-white/80 dark:bg-white/5 text-rose-950 dark:text-rose-200 border-rose-100 dark:border-rose-900/30 shadow-rose-200/20", accentColor: "text-rose-500", atmosphere: "opacity-25" },
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
  const [currentView, setCurrentView] = useState<"home" | "chat" | "settings">("home");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Initialization ---

  useEffect(() => {
    const savedChats = localStorage.getItem("humaira_v3_chats");
    const savedTheme = localStorage.getItem("humaira_v3_theme") as "dark" | "light";
    const savedName = localStorage.getItem("humaira_v3_name");

    if (savedTheme) setTheme(savedTheme);
    if (savedName) setUserName(savedName);
    
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
    }
  }, [chats, theme, userName, isLoaded]);

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
          systemInstruction: `${MODES[mode].prompt}\nUser name is ${userName}. Currently in ${mood} mood.\n${mode === "FUN" ? `You are roleplaying as the user's ${funGender} companion.` : ""}\nBe smart, empathetic, and humman-like.`
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
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-16 h-16 rounded-full bg-indigo-500 blur-md" />
        <h1 className="mt-8 text-2xl font-display font-bold text-slate-800 dark:text-white tracking-tight">Humaira AI</h1>
        <p className="mt-2 text-xs text-slate-400 font-bold uppercase tracking-widest">Waking up from dreams...</p>
      </div>
    );
  }

  const moodData = MOODS[mood];

  return (
    <div className={cn("fixed inset-0 flex flex-col transition-all duration-1000", moodData.gradient, theme === "dark" && "dark")}>
      <div className={cn("absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.5),_transparent)]")} />

      {/* Modern Header */}
      <header className="h-20 px-6 shrink-0 flex items-center justify-between z-40 bg-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </button>
        </div>

        {currentView === "home" ? (
           <h1 className="text-xl font-display font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
             Humaira <span className="text-indigo-600 dark:text-indigo-400">AI</span> 
           </h1>
        ) : currentView === "settings" ? (
           <h1 className="text-xl font-display font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
             Settings
           </h1>
        ) : (
           <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5">
                 <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Humaira&backgroundColor=e0e7ff" alt="Humaira" className="w-full h-full object-cover scale-110" />
                 </div>
                 <h1 className="text-sm font-bold text-slate-800 dark:text-white">Humaira AI</h1>
                 <BadgeCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                 <currentModel.icon className="w-3 h-3 text-indigo-500" />
                 <span>{currentModel.name} Mode</span>
              </div>
           </div>
        )}

        <div className="flex items-center gap-2 w-16 justify-end">
          {currentView === "home" ? (
            <div className="relative group cursor-pointer" onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                   <currentModel.icon className={cn("w-4 h-4 text-indigo-500")} />
                   <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mood</span>
                   <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
             
               {/* Model Dropdown */}
               <AnimatePresence>
                {isModelMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[50]" onClick={(e) => { e.stopPropagation(); setIsModelMenuOpen(false); }} />
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-64 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-2xl p-2 z-[60]">
                      {MODELS.map(m => (
                        <button key={m.id} onClick={() => { setCurrentModel(m); setIsModelMenuOpen(false); }} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all", currentModel.id === m.id ? "bg-indigo-50 dark:bg-white/5 text-indigo-600" : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300")}>
                          <div className="flex items-center gap-3">
                            <m.icon className={cn("w-5 h-5", m.color)} />
                            <div className="text-left">
                              <div className="text-sm font-bold">{m.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{m.tag}</div>
                            </div>
                          </div>
                          {currentModel.id === m.id && <CheckCheck className="w-4 h-4 text-indigo-500" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : currentView === "chat" ? (
             <div className="flex items-center gap-1">
                <button className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors">
                  <Sparkles className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
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
          <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 xl:px-64 py-4 space-y-10 pb-48 scroll-smooth scrollbar-hide flex flex-col items-center justify-center mt-[-5%] text-center">
            <div className="relative mb-6">
               <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/50 dark:border-slate-800 shadow-2xl relative z-10 bg-indigo-50 dark:bg-slate-800 flex items-center justify-center">
                  <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Humaira&backgroundColor=e0e7ff" alt="Humaira" className="w-full h-full object-cover scale-110" />
               </div>
               <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white rounded-full p-2 border-4 border-white dark:border-slate-900 shadow-xl z-20">
                  <Sparkles className="w-4 h-4" />
               </div>
               <div className="absolute inset-0 bg-indigo-500/20 blur-3xl -z-10 rounded-full scale-150 animate-pulse" />
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-display font-black text-slate-800 dark:text-white leading-tight tracking-tight">
              Hey {userName.split(" ")[0]}!
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-md mx-auto text-base sm:text-lg font-medium leading-relaxed">
              I'm Humaira. How can I help you today?
            </p>

            <div className="mt-12 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2">
              {[
                { text: "Help me study Physics", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                { text: "Let's chat in Bangla", icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                { text: "Solve this Math problem", icon: Sparkles, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
                { text: "Just a casual chat", icon: Coffee, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" }
              ].map((item, i) => (
                <button key={i} onClick={() => handleSendMessage(item.text)} className="group flex items-center gap-4 p-4 sm:p-5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl text-left hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                  <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.bg, item.color)}>
                     <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                     <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">{item.text}</div>
                     <div className="text-xs text-slate-400 font-medium mt-0.5">Quick Start</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : currentView === "settings" ? (
          <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 xl:px-64 py-8 pb-48 scroll-smooth scrollbar-hide">
            <h2 className="text-3xl font-display font-black text-slate-800 dark:text-white mb-8">Settings</h2>
            <div className="space-y-6 max-w-2xl">
               <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-6">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Profile</h3>
                 <div className="flex flex-col gap-4">
                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Your Name</label>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={e => setUserName(e.target.value)}
                      className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
               </div>
               
               <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-6">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Appearance</h3>
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Dark Mode</span>
                    <button 
                      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                      className={cn("w-14 h-8 rounded-full transition-colors flex items-center px-1", theme === "dark" ? "bg-indigo-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start")}
                    >
                       <div className="w-6 h-6 rounded-full bg-white shadow-sm" />
                    </button>
                 </div>
               </div>
               <button onClick={() => setCurrentView("home")} className="w-full py-4 rounded-full bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-colors">
                  Back to Home
               </button>
            </div>
          </div>
        ) : (
          <div ref={scrollRef} id="chat-scroll-area" className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 xl:px-64 py-4 space-y-10 pb-48 scroll-smooth scrollbar-hide">
            {activeChat?.messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col gap-2 max-w-[90%] md:max-w-[75%]", m.role === "user" ? "ml-auto items-end" : "mr-auto items-start")}>
                <div className={cn("flex items-center gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400">
                    {m.role === "assistant" ? "H" : "M"}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{m.role === "assistant" ? "Humaira AI" : "Me"}</span>
                </div>
                <div className={cn("px-6 py-4 rounded-3xl shadow-sm border text-[15.5px] leading-relaxed transition-all", m.role === "user" ? "bg-slate-800 text-white border-slate-700 rounded-tr-none" : cn(MOODS[m.mood || "calm"].bubbleClass, "rounded-tl-none"))}>
                  {m.role === "assistant" ? (
                    <div className="space-y-4">
                      {parseThinkingAndSteps(m.content).reasoning && (
                        <details className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded-2xl border dark:border-white/5 group transition-all">
                          <summary className="font-bold text-slate-400 flex items-center gap-2 cursor-pointer list-none">
                            <Brain className="w-3.5 h-3.5" /> Logical Inference
                            <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
                          </summary>
                          <p className="mt-3 text-slate-500 italic leading-relaxed pl-4 border-l-2 border-indigo-200">
                            {parseThinkingAndSteps(m.content).reasoning}
                          </p>
                        </details>
                      )}
                      <div className="markdown-content" dangerouslySetInnerHTML={{ __html: parseThinkingAndSteps(m.content).html }} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
            {isGenerating && (
              <div className="flex items-start gap-4 mr-auto">
                <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/20 animate-pulse flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                <div className={cn("px-6 py-4 rounded-[28px] border flex gap-1.5", moodData.bubbleClass)}>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
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
          <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 z-40 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <div className="flex flex-col rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-none focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all overflow-hidden">
              
              <div className="flex items-end gap-2 p-2 relative">
                <button className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0">
                  <Plus className="w-5 h-5" />
                </button>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Message Humaira..."
                  className="flex-1 bg-transparent py-3 text-base outline-none max-h-48 overflow-y-auto resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-white"
                />
                
                <div className="flex items-center gap-1 pr-1 pb-1">
                   {!inputValue.trim() && !isGenerating && (
                       <button onClick={() => setIsLiveActive(true)} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0">
                         <Mic className="w-5 h-5" />
                       </button>
                   )}
                   {isGenerating ? (
                     <button onClick={() => abortControllerRef.current?.abort()} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                       <Square className="w-5 h-5 fill-current" />
                     </button>
                   ) : (
                     <button onClick={() => handleSendMessage()} disabled={!inputValue.trim()} className={cn("p-3 rounded-full transition-all duration-300", inputValue.trim() ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500")}>
                       <Send className="w-5 h-5" />
                     </button>
                   )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-6 mt-1">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Humaira AI can make mistakes. Consider verifying important information.
              </p>
              {currentView === "home" && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest hidden md:block">
                  Developed by RSF ROBIUL
                </p>
              )}
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Sidebar / Menu */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-slate-50 dark:bg-slate-900 z-[110] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm relative shrink-0">
                     <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Humaira&backgroundColor=e0e7ff" alt="Humaira" className="w-full h-full object-cover scale-110" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-none mb-1">Humaira AI</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Your AI Companion</p>
                  </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 no-scrollbar pb-10">
                
                <section>
                   <button onClick={() => { createNewChat(); setIsSidebarOpen(false); }} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                         </div>
                         <span className="font-bold text-slate-800 dark:text-white">New Chat</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                   </button>
                </section>

                <section>
                  <div className="px-2 mb-3 text-[11px] font-bold text-slate-800 dark:text-slate-200">Chats</div>
                  <div className="space-y-1">
                     {chats.slice(0, 3).map(chat => (
                        <button key={chat.id} onClick={() => { setActiveChatId(chat.id); setCurrentView("chat"); setIsSidebarOpen(false); }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left group", activeChatId === chat.id ? "bg-white dark:bg-slate-800 shadow-sm" : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50")}>
                           <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                              <MessageSquare className="w-4 h-4" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className={cn("truncate text-sm font-semibold transition-colors", activeChatId === chat.id ? "text-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white")}>{chat.title}</div>
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{chat.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                           </div>
                        </button>
                     ))}
                     {chats.length > 3 && (
                        <button className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                           View all chats <ChevronRight className="w-3 h-3" />
                        </button>
                     )}
                     {chats.length === 0 && (
                        <div className="px-4 py-2 text-xs text-slate-400">No chats yet.</div>
                     )}
                  </div>
                </section>

                <section>
                  <div className="px-2 mb-3 text-[11px] font-bold text-slate-800 dark:text-slate-200">Mood</div>
                  <button onClick={() => setIsModelMenuOpen(true)} className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                     <div className="flex items-center gap-3">
                         <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400")}>
                            <currentModel.icon className="w-4 h-4" />
                         </div>
                         <div className="text-left flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentModel.name}</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-white">{currentModel.tag}</span>
                         </div>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                </section>

                <section>
                  <div className="px-2 mb-3 text-[11px] font-bold text-slate-800 dark:text-slate-200">Tools & Settings</div>
                  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden flex flex-col p-1">
                     <button onClick={() => { setCurrentView("settings"); setIsSidebarOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Mood Settings</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                     </button>
                     <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="w-full flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-slate-400 capitalize">{theme}</span>
                           <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                        </div>
                     </button>
                     <button className="w-full flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Memory</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-indigo-500 font-bold">On</span>
                           <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                        </div>
                     </button>
                     <button className="w-full flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Customize Humaira</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                     </button>
                     <button className="w-full flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Language</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-slate-400">English</span>
                           <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                        </div>
                     </button>
                     <button className="w-full flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Help & Support</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                     </button>
                  </div>
                </section>
                
              </div>
              
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-white/5">
                 <button className="flex items-center gap-3 text-red-500 font-bold text-sm px-2 py-2 w-full rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <LogOut className="w-5 h-5" /> Log Out
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.1),_transparent)]" />
            
            <header className="flex items-center justify-between z-10 shrink-0">
              <button onClick={() => setIsLiveActive(false)} className="px-4 py-2 bg-white/5 text-white/60 hover:text-white rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Chat
              </button>
              <div className="text-xs font-black text-indigo-400 uppercase tracking-[4px]">ORIGIN LIVE</div>
              <div className="w-10 h-10 bg-white/5 rounded-full" />
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-12 z-10 p-4">
              <div className="relative">
                <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 5, repeat: Infinity }} className="w-56 h-56 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-3xl flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 animate-spin-slow" />
                  <div className="w-44 h-44 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center shadow-2xl relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 opacity-60 flex items-center justify-center">
                      <Heart className="w-12 h-12 text-white/50" />
                    </div>
                    <div className="absolute inset-x-0 bottom-8 flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => <motion.div key={i} animate={{ height: [2, 16, 2] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} className="w-1 bg-white rounded-full" />)}
                    </div>
                  </div>
                </motion.div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-display font-bold text-white tracking-tight">I'm Listening...</h2>
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
        .formula-header { display: flex; items-center; gap: 0.5rem; text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2; }
        .formula-content { font-size: 1.1rem; color: #1e293b; font-weight: 600; }
        .dark .formula-content { color: white; }
        .note-box { background: #fef9c3; padding: 1rem; border-radius: 1rem; border-left: 4px solid #facc15; margin: 1.25rem 0; font-size: 0.9rem; color: #854d0e; }
        .dark .note-box { background: rgba(250, 204, 21, 0.05); color: #fef9c3; border-color: #facc15; }
        .step-line { display: flex; align-items: flex-start; gap: 0.75rem; margin: 1.25rem 0; }
        .step-num { shrink-0 flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full text-[10px] font-black; margin-top: 0.25rem; }
        .step-text { font-weight: 700; color: #1e293b; }
        .dark .step-text { color: white; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
}
