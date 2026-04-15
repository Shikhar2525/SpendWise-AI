import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessageSquare, Send, Bot, User, Sparkles, TrendingUp, AlertCircle, Lightbulb, History, Trash2, Info } from 'lucide-react';
import { chatWithFinanceAI, getFinancialInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { useCurrency } from '../contexts/CurrencyContext';
import { db, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  content: string;
  id?: string;
  uid?: string;
  createdAt?: string;
  error?: boolean;
}

interface AIChatbotProps {
  data: {
    expenses: Expense[];
    dues: Due[];
    salaries: Salary[];
    budgets: Budget[];
    goals: Goal[];
    loading: boolean;
  };
}

export default function AIChatbot({ data }: AIChatbotProps) {
  const { user } = useAuth();
  const { preferredCurrency } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [insights, setInsights] = useState<{ overspending: string[], suggestions: string[], prediction: string } | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const INTRO_MESSAGE = "Hello! I'm SpendWise AI, your personal financial assistant. I can help you analyze your spending, track your budgets, suggest savings strategies, and answer any questions about your financial data. How can I help you today?";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load chat history from Firestore
  useEffect(() => {
    if (!user) return;

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
          setMessages([
            { role: 'model', content: INTRO_MESSAGE }
          ]);
        } else {
          setMessages(history);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        handleFirestoreError(error, OperationType.LIST, 'chats');
        setMessages([
          { role: 'model', content: INTRO_MESSAGE }
        ]);
      }
    };

    loadChatHistory();
  }, [user]);

  const handleSendMessage = async (retryMessage?: string) => {
    const messageText = retryMessage || input.trim();
    if (!messageText || !user) return;

    if (!retryMessage) {
      const userMessage: Message = { role: 'user', content: messageText, uid: user.uid, createdAt: new Date().toISOString() };
      setInput('');
      setMessages(prev => [...prev, userMessage]);
    } else {
      // If retrying, remove the previous error flag from the last message if it was the same
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, error: false } : m));
    }
    
    setIsTyping(true);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, 'chats'), { role: 'user', content: messageText, uid: user.uid, createdAt: new Date().toISOString() });

      const response = await chatWithFinanceAI(messageText, preferredCurrency.code, data, messages.map(m => ({ role: m.role, content: m.content })));
      
      const aiMessage: Message = { role: 'model', content: response, uid: user.uid, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message to Firestore
      await addDoc(collection(db, 'chats'), aiMessage);
    } catch (error) {
      console.error('Chat error:', error);
      // Mark the last message as having an error
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], error: true };
        }
        return newMessages;
      });
      toast.error('Failed to send message. Please check your connection.');
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    if (!user || !window.confirm('Are you sure you want to clear your chat history?')) return;
    
    try {
      const q = query(collection(db, 'chats'), where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'chats', d.id)));
      await Promise.all(deletePromises);
      
      setMessages([
        { role: 'model', content: "Chat history cleared. How can I help you today?" }
      ]);
      toast.success('Chat history cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat history');
    }
  };

  const generateInsights = async () => {
    setIsGeneratingInsights(true);
    const result = await getFinancialInsights(data, preferredCurrency.code);
    setInsights(result);
    setIsGeneratingInsights(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Insights Panel */}
      <div className="lg:col-span-1">
        <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden flex flex-col h-full">
          <CardHeader className="bg-zinc-900 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-amber-400" />
                AI Insights
              </CardTitle>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] uppercase tracking-tighter">Beta</Badge>
            </div>
            <CardDescription className="text-zinc-400">Smart analysis of your spending habits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 flex-1">
            {!insights && !isGeneratingInsights && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Ready to analyze</p>
                  <p className="text-xs text-zinc-500">Click below to get personalized insights</p>
                </div>
                <Button 
                  onClick={generateInsights} 
                  className="w-full bg-zinc-900 text-white hover:bg-zinc-800 font-bold"
                >
                  Generate Insights
                </Button>
              </div>
            )}

            {isGeneratingInsights && (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <p className="text-sm text-zinc-400">Analyzing your data...</p>
              </div>
            )}

            {insights && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" /> Overspending
                  </h4>
                  <ul className="space-y-1">
                    {insights.overspending.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-600">• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                    <Lightbulb className="h-3 w-3" /> Suggestions
                  </h4>
                  <ul className="space-y-1">
                    {insights.suggestions.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-600">• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" /> Prediction
                  </h4>
                  <p className="text-sm text-zinc-600 italic">"{insights.prediction}"</p>
                </div>

                <Button 
                  variant="outline" 
                  onClick={generateInsights} 
                  className="w-full border-zinc-200 text-zinc-900 hover:bg-zinc-50"
                >
                  Refresh Analysis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card className="lg:col-span-2 border-zinc-200 shadow-sm flex flex-col h-[600px]">
        <CardHeader className="border-b border-zinc-100 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-zinc-900 p-2 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Financial Assistant</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none text-[10px] h-4 px-1.5">Online</Badge>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1" title="Chats are preserved for 24 hours">
                  <History className="h-3 w-3" />
                  Preserved (24h)
                </span>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearChat}
            className="text-zinc-400 hover:text-red-600 hover:bg-red-50 gap-2 h-8"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-200' : 'bg-zinc-900 text-white'}`}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm border ${
                      msg.role === 'user' 
                        ? 'bg-zinc-900 text-white border-zinc-800 rounded-tr-none' 
                        : 'bg-white text-zinc-900 border-zinc-100 rounded-tl-none'
                    }`}>
                      <div className="markdown-body">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.error && (
                        <div className="mt-2 flex items-center gap-2 text-rose-400">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-[10px]">Network error</span>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-[10px] text-white underline"
                            onClick={() => handleSendMessage(msg.content)}
                          >
                            Resend
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-zinc-100 rounded-2xl px-4 py-2 flex items-center gap-1">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.2s]"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-zinc-100">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex gap-2"
            >
              <Input 
                placeholder="Type your message..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 border-zinc-200 focus-visible:ring-zinc-900"
              />
              <Button type="submit" size="icon" className="bg-zinc-900 hover:bg-zinc-800 text-white">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
