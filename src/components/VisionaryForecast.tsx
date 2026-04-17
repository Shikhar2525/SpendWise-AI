import * as React from 'react';
import { Card, CardContent } from './ui/card';
import { Sparkles, TrendingUp, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Salary } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';

interface VisionaryForecastProps {
  income: number;
  expenses: number;
  funFact?: string;
}

export function VisionaryForecast({ income, expenses, funFact }: VisionaryForecastProps) {
  const { preferredCurrency, formatAmount } = useCurrency();
  const [forecast, setForecast] = React.useState<{ text: string, type: 'positive' | 'neutral' | 'warning' } | null>(null);

  React.useEffect(() => {
    if (funFact) {
      setForecast({ text: funFact, type: 'neutral' });
      return;
    }
    // Fallback logic if no funFact is provided (not used currently but good for safety)

    const netSavings = income - expenses;
    let text = "";
    let type: 'positive' | 'neutral' | 'warning' = 'neutral';

    if (income === 0) {
      text = "Fuel up your income stream to start your journey to wealth.";
      type = 'warning';
    } else if (netSavings > 0) {
      const yearlySavings = netSavings * 12;
      // Very simple fun calculation: How long to reach 1 Million in preferred currency
      const target = 1000000;
      const yearsToMillion = Math.ceil(target / yearlySavings);
      const targetYear = new Date().getFullYear() + yearsToMillion;

      if (yearsToMillion <= 5) {
        text = `At this elite velocity, you'll reach Millionaire status by ${targetYear}. Outstanding.`;
        type = 'positive';
      } else if (yearsToMillion <= 15) {
        text = `Solid trajectory. You're on track to hit the 1 Million mark by ${targetYear}.`;
        type = 'positive';
      } else {
        text = `You're building a foundation. By ${targetYear}, your portfolio will cross the Million line.`;
        type = 'neutral';
      }
    } else {
      text = "Your current trajectory is burning capital. Optimize expenses to realign with wealth goals.";
      type = 'warning';
    }

    const result = { text, type };
    setForecast(result);
    sessionStorage.setItem('spendwise_visionary_forecast', JSON.stringify(result));
  }, [income, expenses]);

  if (!forecast) return null;

  const colors = {
    positive: "from-emerald-500/10 to-indigo-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    neutral: "from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20 text-indigo-700 dark:text-indigo-400 dark:bg-zinc-950",
    warning: "from-rose-500/10 via-amber-500/5 to-transparent border-rose-500/20 text-rose-700 dark:text-rose-400 dark:bg-zinc-950"
  };

  const icons = {
    positive: <TrendingUp className="h-5 w-5" />,
    neutral: <Target className="h-5 w-5" />,
    warning: <Zap className="h-5 w-5" />
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[2.5rem] border bg-gradient-to-br transition-all p-8 ${colors[forecast.type]}`}
    >
      <div className="absolute top-0 right-0 p-12 opacity-5 transform scale-[2.5] rotate-12 -translate-y-8">
        <Sparkles className="h-32 w-32" />
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className={`shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 shadow-2xl border border-current/20`}>
          {icons[forecast.type]}
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-2">
            {funFact ? "Financial Fun Fact" : "Advanced Prediction Engine"}
          </h4>
          <p className="text-xl font-black tracking-tight leading-tight italic uppercase">
            {forecast.text}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
