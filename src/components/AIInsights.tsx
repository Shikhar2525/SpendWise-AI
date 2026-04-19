import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { 
  Sparkles, TrendingUp, AlertCircle, Lightbulb, 
  Activity, ArrowUpRight, ArrowDownRight, 
  BarChart3, Target, PieChart, ShieldCheck, 
  Zap, Info, RefreshCcw, LayoutGrid, List
} from 'lucide-react';
import { getFinancialInsights } from '../services/geminiService';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { useCurrency } from '../contexts/CurrencyContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AIInsightsProps {
  data: {
    expenses: Expense[];
    dues: Due[];
    salaries: Salary[];
    budgets: Budget[];
    goals: Goal[];
    loading: boolean;
  };
}

const INSIGHT_SHORTCUTS = [
  { label: "Spending Efficiency", icon: Activity, description: "Check how efficient your lifestyle is." },
  { label: "Savings Velocity", icon: TrendingUp, description: "Analyze your path to your goals." },
  { label: "Risk Mitigation", icon: ShieldCheck, description: "Scan for potential financial leaks." },
  { label: "Budget Compliance", icon: Target, description: "See where you're overshooting." },
];

export default function AIInsights({ data }: AIInsightsProps) {
  const { preferredCurrency, liveRates } = useCurrency();
  const [insights, setInsights] = useState<{ overspending: string[], suggestions: string[], prediction: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const result = await getFinancialInsights(data, preferredCurrency.code, liveRates);
      setInsights(result);
      toast.success('Financial audit complete.');
    } catch (err) {
      toast.error('Audit failed. AI link unstable.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px] font-bold tracking-wider text-indigo-500 border-indigo-500/20 bg-indigo-500/5 px-3 py-1">
            Financial Intelligence
          </Badge>
          <h1 className="text-4xl font-black tracking-tighter leading-none">Deep Insights</h1>
          <p className="text-zinc-500 text-sm font-medium">Global financial pattern recognition and predictive auditing.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-2xl">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className="rounded-xl h-9 w-9"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('list')}
              className="rounded-xl h-9 w-9"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            onClick={generateInsights} 
            disabled={isGenerating}
            className="h-12 px-8 bg-zinc-950 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-black rounded-2xl shadow-xl shadow-indigo-500/10 font-bold tracking-tight transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCcw className="h-4 w-4 mr-3 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-3" />
                Generate Audit
              </>
            )}
          </Button>
        </div>
      </div>

      {!insights && !isGenerating && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {INSIGHT_SHORTCUTS.map((s, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={generateInsights}
              className="p-8 rounded-[2.5rem] bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 text-left hover:border-indigo-500/30 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-700">
                <s.icon className="h-32 w-32" />
              </div>
              <div className="h-14 w-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 mb-6 group-hover:scale-110 group-hover:rotate-6">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">{s.label}</h3>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">{s.description}</p>
            </motion.button>
          ))}
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-40 space-y-8">
           <div className="relative h-24 w-24">
              <div className="absolute inset-0 border-4 border-indigo-500/5 rounded-full" />
              <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Zap className="h-8 w-8 text-indigo-500 animate-pulse" />
              </div>
           </div>
           <div className="text-center space-y-3">
              <p className="text-xs font-black uppercase tracking-[.5em] text-zinc-400 animate-pulse">Initializing Neural Link</p>
              <p className="text-[10px] text-zinc-500 font-bold max-w-md mx-auto leading-relaxed">Cross-referencing transactions, recurring dues, and budget limits against behavioral patterns...</p>
           </div>
        </div>
      )}

      <AnimatePresence>
        {insights && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Top Prediction Bar */}
            <Card className="border-none bg-indigo-600 text-white shadow-2xl shadow-indigo-500/20 rounded-[3rem] overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-12 opacity-10 transform scale-150 rotate-12">
                 <Sparkles className="h-64 w-64" />
              </div>
              <CardContent className="p-12 relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="shrink-0 h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white shadow-2xl group-hover:rotate-3 transition-transform">
                  <BarChart3 className="h-10 w-10" />
                </div>
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] font-bold tracking-widest px-4 py-1.5 rounded-full">
                    Executive Forecast
                  </Badge>
                  <p className="text-2xl md:text-4xl font-bold tracking-tighter leading-[1.1]">
                    "{insights.prediction}"
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className={cn(
               "grid gap-8",
               viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            )}>
              {/* Risk Vectors */}
              <Card className="border-zinc-100 dark:border-zinc-900 shadow-xl rounded-[3rem] bg-white dark:bg-zinc-950 overflow-hidden group">
                <CardHeader className="p-10 border-b border-zinc-50 dark:border-zinc-900 bg-rose-500/[0.02]">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/5 group-hover:scale-110 transition-transform">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Risk Vectors</CardTitle>
                      <CardDescription className="text-rose-600/60 font-medium text-[10px] tracking-tight mt-1">Operational Deviations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-6">
                  {insights.overspending.map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm font-medium leading-relaxed flex gap-5 group/item transition-all hover:bg-white dark:hover:bg-zinc-800 hover:shadow-xl hover:border-rose-500/20"
                    >
                      <div className="shrink-0 h-6 w-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 text-[10px] font-black shadow-inner">
                        !
                      </div>
                      <span className="text-zinc-600 dark:text-zinc-300">{item}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Strategic Suggestions */}
              <Card className="border-zinc-100 dark:border-zinc-900 shadow-xl rounded-[3rem] bg-white dark:bg-zinc-950 overflow-hidden group">
                <CardHeader className="p-10 border-b border-zinc-50 dark:border-zinc-900 bg-emerald-500/[0.02]">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/5 group-hover:scale-110 transition-transform">
                      <Lightbulb className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Strategic Moves</CardTitle>
                      <CardDescription className="text-emerald-600/60 font-medium text-[10px] tracking-tight mt-1">Capital Preservation Actions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-6">
                  {insights.suggestions.map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm font-medium leading-relaxed flex gap-5 group/item transition-all hover:bg-white dark:hover:bg-zinc-800 hover:shadow-xl hover:border-emerald-500/20"
                    >
                      <div className="shrink-0 h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-[10px] font-black shadow-inner">
                        +
                      </div>
                      <span className="text-zinc-600 dark:text-zinc-300">{item}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
            
            {/* Context Info */}
            <div className="p-10 rounded-[3rem] bg-zinc-50 dark:bg-black/50 border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl">
                 <Info className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="space-y-1">
                 <p className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Audit Protocol</p>
                 <p className="text-[11px] text-zinc-500 font-medium max-w-2xl leading-relaxed">
                   Insights are generated using predictive pattern recognition models. These suggestions are based on current ledger trajectory and historical averages. Review manually before executing major capital shifts.
                 </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
