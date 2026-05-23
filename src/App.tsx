
import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Menu, Star, Plus, Heart, Flame, Smile, Trophy, MessageCircle, Moon, Anchor, Sun, LogOut, Mic, Layout, User, Send, Check, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "./lib/utils";
import { auth, googleProvider, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";

// --- Types & Constants ---
type Mode = "ROMANTIC" | "ROAST" | "FRIENDLY_ROAST" | "ROAST_MOTIVATE" | "NORMAL" | "ISLAMIC" | "LEGEND";

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
  { id: "gemini-3.5-flash", name: "Gemini" }
];

const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string; theme: any; isPro?: boolean }> = {
  ROMANTIC: { label: "Romantic Mode", icon: Heart, category: "ROAST MODES", prompt: "You are Humaira, madly in love with the user. You speak very romantically, in Bengali.", theme: { primary: "bg-rose-500", textLight: "text-rose-500" } },
  ROAST: { label: "Roast Mode", icon: Flame, category: "ROAST MODES", prompt: "You are Humaira, a ruthless roaster. You roast the user heavily in fun Bengali.", theme: { primary: "bg-amber-500", textLight: "text-amber-500" } },
  FRIENDLY_ROAST: { label: "Friendly Roast", icon: Smile, category: "ROAST MODES", prompt: "You are Humaira. You roast playfully but show you care in Bengali.", theme: { primary: "bg-orange-500", textLight: "text-orange-500" } },
  ROAST_MOTIVATE: { label: "Roast + Motivate", icon: Trophy, category: "ROAST MODES", prompt: "You are Humaira. You roast the user for being lazy, then motivate them fiercely in Bengali.", theme: { primary: "bg-indigo-500", textLight: "text-indigo-500" } },
  NORMAL: { label: "Normal Chat", icon: MessageCircle, category: "NORMAL", prompt: "You are Humaira, a helpful normal AI assistant, replying in Bengali.", theme: { primary: "bg-slate-500", textLight: "text-slate-500" } },
  ISLAMIC: { label: "Islamic Mode", icon: Moon, category: "PRO MODES 👑", prompt: "You are Humaira. You give Islamic guidance based on Quran and Sunnah in Bengali.", theme: { primary: "bg-emerald-500", textLight: "text-emerald-500" }, isPro: true },
  LEGEND: { label: "Legend Mode", icon: Anchor, category: "PRO MODES 👑", prompt: "You are Humaira, highly confident legend persona in Bengali.", theme: { primary: "bg-blue-500", textLight: "text-blue-500" }, isPro: true },
};

const parseThinkingAndSteps = (content: string) => {
    return { html: DOMPurify.sanitize(marked.parse(content) as string), reasoning: "" };
};

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  const [mode, setMode] = useState<Mode>("NORMAL");
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<"user"|"admin">("user");
  const [userName, setUserName] = useState("Ayan");
  const [userProfilePic, setUserProfilePic] = useState("");
  const [xp, setXp] = useState(1250);
  const [loveLanguage, setLoveLanguage] = useState("Words of Affirmation");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [streak, setStreak] = useState(1);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Draft
  useEffect(() => {
    const draft = localStorage.getItem(`chatDraft_${activeChatId || 'home'}`);
    if (draft !== null) setInputValue(draft);
    else setInputValue("");
  }, [activeChatId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    localStorage.setItem(`chatDraft_${activeChatId || 'home'}`, e.target.value);
  };

  // Auth & Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || "user");
            setUserName(data.name || user.displayName || "Ayan");
            setUserProfilePic(data.photoURL || user.photoURL || "");
            setXp(data.xp || 1250);
            setLoveLanguage(data.loveLanguage || "Words of Affirmation");
            setAnniversaryDate(data.anniversaryDate || "");
            setStreak(data.streak || 1);
            setAchievements(data.achievements || []);
          } else {
            const isAdmin = user.email === 'hmrobiulislam75@gmail.com' && user.emailVerified;
            const newRole = isAdmin ? "admin" : "user";
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
            });
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
    });
    return () => unsub();
  }, [firebaseUser]);

  const handleLogin = async () => signInWithPopup(auth, googleProvider);
  const handleLogout = async () => signOut(auth);

  const syncProfile = async (field: string, value: any) => {
    if (!firebaseUser) return;
    try { await updateDoc(doc(db, "users", firebaseUser.uid), { [field]: value }); } catch (e) {}
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
    } catch (e) {}
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chats, activeChatId, isGenerating]);

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId) || null, [chats, activeChatId]);

  const createNewChat = () => {
    setActiveChatId(null);
    setIsSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     if(firebaseUser) deleteDoc(doc(db, "users", firebaseUser.uid, "chats", id));
     if(activeChatId === id) setActiveChatId(null);
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

      const sysInstruction = MODES[mode].prompt;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history,
          systemInstruction: sysInstruction,
          model: currentModel.id === "gemini-2.0-flash" ? "gemini-3.5-flash" : currentModel.id
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
             syncChatData(currentChats[updatedChatIndex]);
         }
         return currentChats;
      });
      abortControllerRef.current = null;
    }
  };

  const renderInputForm = (isCentered: boolean) => {
     return (
         <form 
           onSubmit={e => { e.preventDefault(); handleSendMessage(); }} 
           className={cn("flex flex-col gap-1.5 rounded-2xl md:rounded-3xl border transition-all duration-300 relative w-full", 
              theme === "dark" 
                ? cn("border-gray-800 focus-within:border-[#f97316]/80 focus-within:ring-2 focus-within:ring-[#f97316]/10", 
                     isCentered ? "shadow-xl bg-gray-900/90" : "shadow-xl bg-gray-950/80 backdrop-blur-md"
                  ) 
                : cn("border-gray-200 focus-within:border-[#f97316]/80 focus-within:ring-2 focus-within:ring-[#f97316]/5", 
                     isCentered ? "shadow-lg bg-white" : "shadow-xl bg-white/95 backdrop-blur-md"
                  ),
              activeChat ? "" : "border-[#f97316]/50"
           )}
           style={{ padding: '8px' }}
         >
           <textarea
              style={{ color: theme === "dark" ? "#f3f4f6" : "inherit" }}
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder={isCentered ? "কাউকে প্রেম নিবেদন করো বা কিছু জিজ্ঞেস করো..." : "কিছু জিজ্ঞেস করো..."}
              rows={1}
              className="resize-none outline-none w-full bg-transparent px-3 py-2 w-full text-gray-800 dark:text-gray-100 font-medium placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed max-h-[120px] text-[15px] sm:text-base border-0 focus:ring-0 focus:outline-none"
           />
           
           <div className="flex items-center justify-between w-full pt-2 pb-1 px-2 border-t border-gray-100 dark:border-gray-800/50">
              <div className="flex items-center gap-1.5">
                  <span className={cn(
                     "text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full leading-none bg-orange-100/60 text-[#f97316] flex items-center gap-1 shadow-sm",
                     theme === "dark" ? "bg-orange-950/20 border border-orange-900/30 text-orange-400" : ""
                  )}>
                     <Heart className="w-2.5 h-2.5 fill-current" />
                     {MODES[mode].label}
                  </span>
              </div>
              
              <div className="flex items-center gap-2">
                 <button type="button" className="flex items-center gap-1 px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold active:bg-gray-100 dark:active:bg-gray-700 transition-colors shadow-sm">
                    {currentModel.name}
                 </button>
                 
                 {inputValue.trim() ? (
                    <button type="submit" className="p-2 text-white bg-gradient-to-r from-orange-500 to-[#f97316] hover:brightness-105 active:scale-95 rounded-full transition-all shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer" disabled={isGenerating}>
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                 ) : (
                    <button type="button" className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full transition-colors active:scale-95">
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
    <div className={cn("flex flex-col h-screen w-full font-sans transition-colors duration-300", theme === "dark" ? "bg-[#0b0f19] text-gray-100" : "bg-[#f9f9f9] text-gray-900")}>
      
      {/* Header */}
      <header className={cn("flex items-center justify-between px-4 py-3 shrink-0 border-b", theme === "dark" ? "border-gray-800 bg-[#0b0f19]" : "border-gray-200 bg-white")}>
          <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                 <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-[#f97316] font-extrabold text-xl tracking-tight">HUMAIRA AI</h1>
          </div>
          <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 text-[#f97316] bg-orange-50 font-bold text-sm tracking-tight">
                 <span className="text-[#f97316]">✦</span> Get Pro
              </button>
              <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                 <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              </button>
          </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto flex flex-col items-center w-full">
         {(!activeChat || activeChat.messages.length === 0) ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 max-w-2xl mx-auto py-8">
                {/* Greeting Avatar with glowing dynamic pulse */}
                <div className="relative mb-6 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f97316] to-pink-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
                    <div className="relative w-[130px] h-[130px] rounded-full border-[6px] border-[#f97316] p-1.5 overflow-hidden bg-white shadow-2xl transition-transform duration-500 group-hover:scale-105">
                       <img src="https://api.dicebear.com/8.x/micah/svg?seed=Humaira" alt="Humaira AI" className="w-full h-full object-cover rounded-full bg-amber-50" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white dark:border-[#0b0f19]" />
                </div>

                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-orange-500 to-pink-500">
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

                {/* Suggestion Pills */}
                <div className="mt-8 w-full">
                    <p className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3.5">
                       QUICK PROMPTS • কিছু আইডিয়া
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
                       {[
                         { text: "আজকে আমার মন অনেক খারাপ! 🥺", mode: "ROMANTIC" },
                         { text: "আমাকে একটা কড়া রোস্ট করো তো! 🌶️", mode: "ROAST" },
                         { text: "একটা সুন্দর প্রেমের কবিতা শোনাও! ❤️", mode: "ROMANTIC" },
                         { text: "জীবনের সফলতার মূল চাবিকাঠি কি? ✨", mode: "ROAST_MOTIVATE" }
                       ].map((suggestion, idx) => (
                          <button 
                             key={idx} 
                             type="button"
                             onClick={() => {
                               setMode(suggestion.mode as Mode);
                               handleSendMessage(suggestion.text);
                             }}
                             className={cn(
                                "p-3.5 text-sm font-semibold text-left rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 shadow-sm active:scale-95",
                                theme === "dark" 
                                  ? "bg-gray-800/40 border-gray-700/80 hover:bg-gray-800 text-gray-200 hover:border-orange-500/50" 
                                  : "bg-white border-gray-200/80 hover:bg-orange-50/20 hover:border-orange-200 text-gray-700 hover:text-[#f97316]"
                             )}
                          >
                             {suggestion.text}
                          </button>
                       ))}
                    </div>
                </div>

                <div className="mt-10 text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                   RSF ROBIUL দ্বারা ডেভেলপ করা Humaira AI চ্যাটবট
                </div>
            </div>
         ) : (
            <div ref={scrollRef} className="w-full max-w-3xl mx-auto flex flex-col gap-6 p-4 pb-28">
               {activeChat.messages.map(m => (
                  <div key={m.id} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
                     {m.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-[#f97316] p-1 flex-shrink-0 mr-2 self-end overflow-hidden flex items-center justify-center shadow-md">
                           <img src="https://api.dicebear.com/8.x/micah/svg?seed=Humaira" alt="H" className="w-full h-full" />
                        </div>
                     )}
                     <div className={cn("px-5 py-3.5 max-w-[80%] rounded-[20px]", 
                        m.role === "user" ? "bg-[#f97316] text-white rounded-br-[4px] shadow-sm font-medium" : 
                        theme === "dark" ? "bg-gray-800 text-gray-50 rounded-bl-[4px] shadow-sm border border-gray-600" : "bg-white text-gray-800 rounded-bl-[4px] shadow-md border border-gray-100"
                     )}>
                         {m.role === "assistant" ? (
                            <div className="markdown-content" dangerouslySetInnerHTML={parseThinkingAndSteps(m.content)} />
                         ) : (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                         )}
                     </div>
                  </div>
               ))}
               {isGenerating && (
                 <div className="flex w-full justify-start mt-2">
                     <div className="w-8 h-8 rounded-full bg-[#f97316] p-1 flex-shrink-0 mr-2 self-end overflow-hidden">
                         <img src="https://api.dicebear.com/8.x/micah/svg?seed=Humaira" alt="H" className="w-full h-full" />
                     </div>
                     <div className={cn("px-5 py-4 max-w-[80%] rounded-[20px] rounded-bl-[4px] flex items-center gap-1.5", theme === "dark" ? "bg-gray-800" : "bg-white border border-gray-100 shadow-sm")}>
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "0ms"}}/>
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}}/>
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "300ms"}}/>
                     </div>
                 </div>
               )}
            </div>
         )}
      </main>

      {/* Floating Bottom Input Form (Only visible when activeChat has messages) */}
      {(activeChat && activeChat.messages.length > 0) && (
         <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f9f9f9]/90 via-[#f9f9f9]/80 to-transparent dark:from-[#0b0f19] dark:via-[#0b0f19]/80 dark:to-transparent z-20 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto w-full">
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
                       <img src="https://api.dicebear.com/8.x/micah/svg?seed=Humaira" alt="Humaira" className="w-full h-full object-cover" />
                   </div>
                   <span className="font-extrabold text-lg text-gray-800 dark:text-gray-100 tracking-tight">Humaira Ai</span>
               </div>
               
               {/* New Chat Button */}
               <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <button onClick={createNewChat} className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 flex items-center justify-center gap-2 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                     <Plus className="w-4 h-4" /> নতুন chat
                  </button>
               </div>

               {/* Sidebar Sections */}
               <div className="flex-1 overflow-y-auto w-full pt-2 pb-6 space-y-5 px-3">
                   {/* Roast Modes */}
                   <div>
                       <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">ROAST MODES</h3>
                       <div className="flex flex-col gap-1">
                           {(["ROMANTIC", "ROAST", "FRIENDLY_ROAST", "ROAST_MOTIVATE"] as Mode[]).map(m => (
                               <button key={m} onClick={() => { setMode(m); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 rounded-xl font-medium text-[15px] flex items-center gap-3 w-full text-left transition-colors", mode === m ? "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                                   {MODES[m].label}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Normal */}
                   <div>
                       <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">NORMAL</h3>
                       <div className="flex flex-col gap-1">
                           {(["NORMAL"] as Mode[]).map(m => (
                               <button key={m} onClick={() => { setMode(m); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 rounded-[12px] font-bold text-[15px] flex items-center gap-3 w-full text-left transition-colors", mode === m ? "bg-[#f9f0e8] text-[#c2410c] dark:bg-orange-900/40 dark:text-orange-300" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                                   {MODES[m].label}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Pro modes */}
                   <div>
                       <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">PRO MODES 👑</h3>
                       <div className="flex flex-col gap-1">
                           {(["ISLAMIC", "LEGEND"] as Mode[]).map(m => {
                               const Icon = MODES[m].icon;
                               return (
                               <button key={m} onClick={() => { setMode(m); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 rounded-[12px] font-semibold text-[15px] flex items-center gap-3 w-full text-left transition-colors", mode === m ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}>
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
                       <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">RECENTS</h3>
                       <div className="flex flex-col gap-1">
                           {chats.length === 0 ? (
                               <div className="px-3 py-2 text-sm text-gray-400">কোনো chat নেই</div>
                           ) : (
                               chats.map(chat => (
                                   <div key={chat.id} className="group flex items-center w-full">
                                      <button onClick={() => { setActiveChatId(chat.id); setIsSidebarOpen(false); }} className={cn("px-3 py-2.5 flex-1 rounded-l-xl font-medium text-sm text-left truncate transition-colors", activeChatId === chat.id ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800")}>
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
        `}
      </style>
    </div>
  );
}
}
