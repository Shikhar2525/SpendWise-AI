import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessageSquare, Send, Bot, User, Sparkles, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';
import { chatWithFinanceAI, getFinancialInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { useCurrency } from '../contexts/CurrencyContext';

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
  const { preferredCurrency } = useCurrency();
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: "Hello! I'm SpendWise AI. How can I help you with your finances today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [insights, setInsights] = useState<{ overspending: string[], suggestions: string[], prediction: string } | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    const response = await chatWithFinanceAI(userMessage, preferredCurrency.code, []);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsTyping(false);
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
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-zinc-200 shadow-sm bg-zinc-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-16 w-16" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI Insights
            </CardTitle>
            <CardDescription className="text-zinc-400">Smart analysis of your spending habits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!insights && !isGeneratingInsights && (
              <Button 
                onClick={generateInsights} 
                className="w-full bg-white text-zinc-900 hover:bg-zinc-100 font-bold"
              >
                Generate Insights
              </Button>
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
                  <h4 className="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" /> Overspending
                  </h4>
                  <ul className="space-y-1">
                    {insights.overspending.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-300">• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Lightbulb className="h-3 w-3" /> Suggestions
                  </h4>
                  <ul className="space-y-1">
                    {insights.suggestions.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-300">• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" /> Prediction
                  </h4>
                  <p className="text-sm text-zinc-300 italic">"{insights.prediction}"</p>
                </div>

                <Button 
                  variant="outline" 
                  onClick={generateInsights} 
                  className="w-full border-zinc-700 text-white hover:bg-zinc-800"
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
        <CardHeader className="border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-zinc-900 p-2 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">SpendWise Assistant</CardTitle>
              <CardDescription>Ask me anything about your finances.</CardDescription>
            </div>
          </div>
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
                    <div className={`rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-zinc-900 text-white rounded-tr-none' : 'bg-zinc-100 text-zinc-900 rounded-tl-none'}`}>
                      <div className="markdown-body">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
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
