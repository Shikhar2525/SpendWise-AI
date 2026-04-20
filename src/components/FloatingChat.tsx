import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageSquare, Send, Bot, Trash2, 
  Terminal, ShieldCheck, X, Sparkles,
  ChevronDown, Minus, Maximize2, Zap,
  Mic, MicOff
} from 'lucide-react';
import { chatWithFinanceAI } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { useCurrency } from '../contexts/CurrencyContext';
import { db, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PlanGate } from './PlanGate';

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

const INTRO_MESSAGE = "Hello! I'm your AI finance assistant. How can I help you manage your money today?";

const STARTER_PROMPTS = [
  { label: "📊 Create a Budget Plan", prompt: "I want to create a comprehensive budget plan for this month. Help me set up my income and spending limits." },
  { label: "🧐 Analyze Spending", prompt: "Can you analyze my recent spending patterns and suggest where I can cut back?" },
  { label: "🎯 Set Savings Goal", prompt: "I want to set a new savings goal. Can you help me figure out a timeline?" },
  { label: "🧾 Check Dues", prompt: "What are my upcoming bills and dues for this month?" }
];

export default function FloatingChat({ data }: FloatingChatProps) {
  const { user } = useAuth();
  const { preferredCurrency, liveRates } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Note: Speech recognition now initialized on-demand in toggleListening for improved robustness
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          setIsListening(false);
          toast.success('Voice captured. Analysis in progress...', { id: 'voice-toast' });
          
          // Automatically send the voice message
          handleVoiceMessage(blob);
          
          // Stop all tracks to release mic
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsListening(true);
        toast.info('Recording... Click again to send.', { 
          id: 'voice-toast',
          icon: <Mic className="h-4 w-4 animate-pulse text-indigo-500" /> 
        });
      } catch (err) {
        console.error('Mic access error:', err);
        toast.error('Mic access denied. Please allow microphone permissions.');
      }
    }
  };

  const handleVoiceMessage = async (blob: Blob) => {
    if (!user) return;

    setIsTyping(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const userMessage: Message = { 
          role: 'user', 
          content: "[Deep Voice Analysis]", 
          uid: user.uid, 
          createdAt: new Date().toISOString() 
        };
        
        const docRef = await addDoc(collection(db, 'chats'), userMessage);
        setMessages(prev => [...prev, { ...userMessage, id: docRef.id }]);
        
        const geminiResponse = await chatWithFinanceAI(
          "", // Empty text, use audio
          preferredCurrency.code, 
          data, 
          messages.map(m => ({ role: m.role, content: m.content })),
          liveRates,
          { data: base64String, mimeType: 'audio/webm' }
        );
        
        processGeminiResponse(geminiResponse);
      };
    } catch (error) {
      toast.error('Voice analysis failed.');
      setIsTyping(false);
      // Remove the placeholder if failed
      setMessages(prev => prev.filter(m => m.content !== "[Deep Voice Analysis]"));
    }
  };

  const processGeminiResponse = async (geminiResponse: any) => {
    if (!user) return;
    
    const functionCalls = geminiResponse.functionCalls;
    let finalContent = geminiResponse.text || '';
    
    // Extract transcription if present
    const transcriptionMatch = finalContent.match(/\[TRANSCRIPTION: (.*?)\]/);
    if (transcriptionMatch) {
      const transcription = transcriptionMatch[1];
      // Update the last user message with the transcribed text
      setMessages(prev => {
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'user' && newMessages[i].content === "[Deep Voice Analysis]") {
            newMessages[i] = { ...newMessages[i], content: transcription };
            // Update in Firestore too
            if (newMessages[i].id) {
              updateDoc(doc(db, 'chats', newMessages[i].id!), { content: transcription });
            }
            break;
          }
        }
        return newMessages;
      });
      // Remove the transcription tag from the AI's response
      finalContent = finalContent.replace(/\[TRANSCRIPTION: (.*?)\]/, '').trim();
    }
    
    if (functionCalls) {
      for (const call of functionCalls) {
        try {
          if (call.name === 'addFinancialEntry') {
            const { type, amount, description, ...others } = call.args as any;
            const collectionMap: Record<string, string> = {
              'expense': 'expenses',
              'income': 'salaries',
              'saving': 'savings',
              'goal': 'goals',
              'due': 'dues',
              'budget': 'budgets'
            };
            const collectionName = collectionMap[type];
            if (!collectionName) throw new Error('Invalid entry type');

            const entryData: any = {
              amount,
              description,
              uid: user.uid,
              createdAt: new Date().toISOString(),
              currency: preferredCurrency.code,
              ...others
            };

            if (type === 'due' && others.dueDate) entryData.dueDate = others.dueDate;
            if (type === 'goal' && others.deadline) entryData.deadline = others.deadline;
            if (type === 'goal' && others.targetAmount) entryData.targetAmount = others.targetAmount;
            if (type === 'saving' && others.savingType) entryData.type = others.savingType;
            if (type === 'budget' && others.month) entryData.month = others.month;
            if (type === 'income') entryData.date = others.date || new Date().toISOString().split('T')[0];
            if (type === 'expense') entryData.date = others.date || new Date().toISOString().split('T')[0];

            await addDoc(collection(db, collectionName), entryData);
            toast.success(`Entry added: ${description} (${amount})`);
            if (!finalContent) finalContent = `Confirmed. I've added that ${type} to your records.`;
          }

          if (call.name === 'editFinancialEntry') {
            const { id, collection: colName, updates } = call.args as any;
            const docRef = doc(db, colName, id);
            await updateDoc(docRef, {
              ...updates,
              updatedAt: new Date().toISOString()
            });
            toast.success(`Entry updated successfully.`);
            if (!finalContent) finalContent = `Understood. I've updated the ${colName.slice(0, -1)} for you.`;
          }
        } catch (err) {
          console.error('Tool execution error:', err);
          finalContent += "\n\n(Note: I tried to update your records but encountered a small sync issue.)";
        }
      }
    }

    if (!finalContent) finalContent = "I've processed your voice command.";

    const aiMessage: Message = { 
      role: 'model', 
      content: finalContent, 
      uid: user.uid, 
      createdAt: new Date().toISOString() 
    };
    setMessages(prev => [...prev, aiMessage]);
    await addDoc(collection(db, 'chats'), aiMessage);
    setIsTyping(false);
  };

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
      const geminiResponse = await chatWithFinanceAI(
        messageText, 
        preferredCurrency.code, 
        data, 
        messages.map(m => ({ role: m.role, content: m.content })),
        liveRates
      );
      
      processGeminiResponse(geminiResponse);
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
          <PlanGate featureName="AI Assistant">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "w-[90vw] sm:w-[450px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col pointer-events-auto shadow-indigo-500/10 dark:shadow-none",
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
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-white/10 dark:bg-black/5 flex items-center justify-center">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest">SpendWise AI</h3>
                      <p className="text-[10px] opacity-70 font-bold mt-0.5">Financial Assistant</p>
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
                    <div className="flex-1 min-h-0 relative">
                      <ScrollArea className="h-full w-full bg-zinc-50 dark:bg-zinc-900/30">
                        <div className="p-6 space-y-6 pb-4">
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
                                <div className="prose prose-sm dark:prose-invert max-w-none text-left">
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                                {msg.error && <p className="text-[10px] text-rose-500 mt-2 font-black uppercase tracking-widest">Network Error.</p>}
                                <p className="text-[8px] opacity-40 mt-2 font-black tracking-widest uppercase">
                                  {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </motion.div>
                          ))}

                          {/* Starter Prompts */}
                          {messages.length === 1 && !isTyping && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="grid grid-cols-1 gap-2 pt-4"
                            >
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 ml-1">Suggested Actions</p>
                              {STARTER_PROMPTS.map((sp, i) => (
                                <Button
                                  key={i}
                                  variant="outline"
                                  className="justify-start h-auto py-3 px-4 rounded-2xl border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-all text-left group"
                                  onClick={() => {
                                    const text = sp.prompt;
                                    setInput('');
                                    if (!user || isTyping) return;
                                    
                                    const fireRequest = async () => {
                                      const userMessage: Message = { 
                                        role: 'user', 
                                        content: text, 
                                        uid: user.uid, 
                                        createdAt: new Date().toISOString() 
                                      };
                                      setMessages(prev => [...prev, userMessage]);
                                      setIsTyping(true);
                                      try {
                                        await addDoc(collection(db, 'chats'), userMessage);
                                        const geminiResponse = await chatWithFinanceAI(
                                          text, 
                                          preferredCurrency.code, 
                                          data, 
                                          messages.map(m => ({ role: m.role, content: m.content })),
                                          liveRates
                                        );
                                        processGeminiResponse(geminiResponse);
                                      } catch (error) {
                                        toast.error('Intelligence link failed.');
                                        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, error: true } : m));
                                      } finally {
                                        setIsTyping(false);
                                      }
                                    };
                                    fireRequest();
                                  }}
                                >
                                  {sp.label}
                                  <Zap className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100 text-indigo-500 transition-all translate-x-2 group-hover:translate-x-0" />
                                </Button>
                              ))}
                            </motion.div>
                          )}
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
                    </div>

                    {/* Input Box */}
                    <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    className="flex gap-2 px-3 py-2 bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
                  >
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={toggleListening}
                      className={cn(
                        "h-9 w-9 rounded-xl shrink-0 transition-all",
                        isListening ? "bg-indigo-500 text-white animate-pulse" : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      )}
                    >
                      {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                    <Input 
                      placeholder={isListening ? "Listening..." : "Type a message..."}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="bg-transparent border-none p-0 h-9 focus-visible:ring-0 text-[14px] font-medium"
                    />
                    <Button 
                      type="submit"
                      size="icon" 
                      disabled={isTyping || !input.trim()}
                      className={cn(
                        "h-9 w-9 bg-zinc-900 border-none dark:bg-white text-white dark:text-black rounded-xl shrink-0 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                        !input.trim() && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                      <div className="mt-4 flex items-center justify-center gap-4 opacity-40">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span className="text-[8px] font-medium whitespace-nowrap">Secure Financial Link</span>
                        <Zap className="h-3 w-3 text-indigo-500" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </PlanGate>
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
                <X className="h-7 w-7" />
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
