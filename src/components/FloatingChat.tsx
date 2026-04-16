import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageSquare, Send, Bot, Trash2, 
  Terminal, ShieldCheck, X, Sparkles,
  ChevronDown, Minus, Maximize2, Zap
} from 'lucide-react';
import { chatWithFinanceAI } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { useCurrency } from '../contexts/CurrencyContext';
import { db, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
  id?: string;
  uid?: string;
  createdAt?: string;
  error?: boolean;
}

interface FloatingChatProps {
  data: {
    expenses: Expense[];
    dues: Due[];
    salaries: Salary[];
    budgets: Budget[];
    goals: Goal[];
    loading: boolean;
  };
}

export default function FloatingChat({ data }: FloatingChatProps) {
  const { user } = useAuth();
  const { preferredCurrency } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const INTRO_MESSAGE = "Intelligence link established. I'm monitoring your financial fabric. \n\nHow can I optimize your trajectory?";

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (!user || !isOpen) return;

    const loadChatHistory = async () => {
      try {
        const q = query(
          collection(db, 'chats'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'asc')
        );
        const querySnapshot = await getDocs(q);
        const history: Message[] = [];
        querySnapshot.forEach((doc) => {
          history.push({ id: doc.id, ...doc.data() } as Message);
        });
        
        if (history.length === 0) {
          setMessages([{ role: 'model', content: INTRO_MESSAGE }]);
        } else {
          setMessages(history);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        handleFirestoreError(error, OperationType.LIST, 'chats');
        setMessages([{ role: 'model', content: INTRO_MESSAGE }]);
      }
    };

    loadChatHistory();
  }, [user, isOpen]);

  const handleSendMessage = async () => {
    const messageText = input.trim();
    if (!messageText || !user) return;

    setInput('');
    const userMessage: Message = { 
      role: 'user', 
      content: messageText, 
      uid: user.uid, 
      createdAt: new Date().toISOString() 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      await addDoc(collection(db, 'chats'), userMessage);
      const response = await chatWithFinanceAI(
        messageText, 
        preferredCurrency.code, 
        data, 
        messages.map(m => ({ role: m.role, content: m.content }))
      );
      
      const actionMatch = response.match(/\[ACTION:(\w+)\|(.+)\]/);
      let finalContent = response;
      
      if (actionMatch) {
        const action = actionMatch[1];
        const actionData = JSON.parse(actionMatch[2]);
        finalContent = response.replace(/\[ACTION:(\w+)\|(.+)\]/, '').trim();
        
        try {
          const collections: Record<string, string> = {
            'ADD_EXPENSE': 'expenses',
            'ADD_INCOME': 'salaries',
            'ADD_SAVING': 'savings',
            'ADD_GOAL': 'goals'
          };

          if (collections[action]) {
            const extraData = action === 'ADD_GOAL' ? { currentAmount: 0 } : {};
            await addDoc(collection(db, collections[action]), { 
              ...actionData, 
              ...extraData,
              uid: user.uid, 
              createdAt: new Date().toISOString() 
            });
            toast.success(`System updated: ${action.replace('ADD_', '').toLowerCase()} recorded.`);
          }
          
          if (!finalContent) finalContent = `Confirmed. Data point established in systems.`;
        } catch (err) {
          finalContent += "\n\n(Sync Warning: Peripheral failure detected. Verify manually.)";
        }
      }

      const aiMessage: Message = { 
        role: 'model', 
        content: finalContent, 
        uid: user.uid, 
        createdAt: new Date().toISOString() 
      };
      setMessages(prev => [...prev, aiMessage]);
      await addDoc(collection(db, 'chats'), aiMessage);
    } catch (error) {
      toast.error('Intelligence link failed.');
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, error: true } : m));
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'chats'), where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'chats', d.id)));
      await Promise.all(deletePromises);
      setMessages([{ role: 'model', content: INTRO_MESSAGE }]);
      toast.success('Cognitive reset complete.');
    } catch (error) {
      toast.error('Failed to purge memory.');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 pointer-events-none">
      
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "w-[90vw] sm:w-[450px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col pointer-events-auto",
              isMinimized ? "h-20" : "h-[600px] max-h-[calc(100vh-120px)]"
            )}
          >
            <AnimatePresence>
              {isClearConfirmOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center"
                >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl space-y-4 max-w-[280px]"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Cognitive Reset</h4>
                      <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                        Proceeding will permanently erase all message logs. This cannot be undone.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setIsClearConfirmOpen(false)}
                         className="rounded-xl h-10 border-zinc-200 dark:border-zinc-800"
                       >
                         Abort
                       </Button>
                       <Button 
                         variant="destructive" 
                         size="sm" 
                         onClick={() => { clearChat(); setIsClearConfirmOpen(false); }}
                         className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white border-none"
                       >
                         Purge
                       </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/20 dark:bg-black/10 flex items-center justify-center">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-none">Assistant</h3>
                    <p className="text-[10px] opacity-60 font-medium mt-1">AI Financial Hub</p>
                  </div>
               </div>
               <div className="flex items-center gap-1">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8 hover:bg-white/10" 
                   onClick={() => setIsMinimized(!isMinimized)}
                 >
                   {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8 hover:bg-white/10" 
                   onClick={() => setIsClearConfirmOpen(true)}
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8 hover:bg-white/10" 
                   onClick={() => setIsOpen(false)}
                 >
                   <X className="h-5 w-5" />
                 </Button>
               </div>
            </div>

            <AnimatePresence>
              {!isMinimized && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-6 bg-zinc-50 dark:bg-black/20">
                    <div className="space-y-6 pb-4">
                      {messages.map((msg, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex w-full",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[85%] rounded-[1.5rem] px-5 py-4 text-[13px] font-medium leading-relaxed relative",
                            msg.role === 'user' 
                              ? "bg-zinc-900 dark:bg-white text-white dark:text-black rounded-tr-none shadow-xl" 
                              : "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none shadow-sm"
                          )}>
                             <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                               <ReactMarkdown>{msg.content}</ReactMarkdown>
                             </div>
                             {msg.error && <p className="text-[10px] text-rose-500 mt-2 font-black uppercase tracking-widest">Link Lost.</p>}
                             <p className="text-[8px] opacity-40 mt-2 font-black tracking-widest uppercase">
                               {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                        </motion.div>
                      ))}
                      {isTyping && (
                        <div className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl w-fit shadow-lg">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        </div>
                      )}
                      <div ref={bottomRef} className="h-2" />
                    </div>
                  </ScrollArea>

                  {/* Input Box */}
                  <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                      className="flex gap-3 px-4 py-3 bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
                    >
                      <Input 
                        placeholder="Type a message..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="bg-transparent border-none p-0 h-8 focus-visible:ring-0 text-[14px] font-medium"
                      />
                      <Button 
                        size="icon" 
                        disabled={!input.trim() || isTyping}
                        className="h-8 w-8 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                    <div className="mt-4 flex items-center justify-center gap-4 opacity-40">
                       <ShieldCheck className="h-3 w-3 text-emerald-600" />
                       <span className="text-[8px] font-medium">Neural Link Verified</span>
                       <Zap className="h-3 w-3 text-indigo-500" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-16 w-16 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-3xl shadow-2xl flex items-center justify-center relative group pointer-events-auto"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div 
               key="close" 
               initial={{ rotate: -90, opacity: 0 }} 
               animate={{ rotate: 0, opacity: 1 }} 
               exit={{ rotate: 90, opacity: 0 }}
            >
              <ChevronDown className="h-8 w-8" />
            </motion.div>
          ) : (
            <motion.div 
               key="open" 
               initial={{ rotate: 90, opacity: 0 }} 
               animate={{ rotate: 0, opacity: 1 }} 
               exit={{ rotate: -90, opacity: 0 }}
               className="relative"
            >
              <MessageSquare className="h-7 w-7" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-indigo-500 rounded-full animate-pulse border-2 border-white dark:border-black" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Sparkle effect on hover */}
        {!isOpen && (
           <div className="absolute flex items-center gap-1 -top-8 bg-zinc-900 text-white text-[8px] font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Assistant
           </div>
        )}
      </motion.button>

    </div>
  );
}
