import * as React from 'react';
import { Card, CardContent } from './ui/card';
import { Sparkles, TrendingUp, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Salary } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';

interface VisionaryForecastProps {
  income: number;
  expenses: number;
}

export function VisionaryForecast({ income, expenses }: VisionaryForecastProps) {
  const { preferredCurrency, formatAmount } = useCurrency();
  const [forecast, setForecast] = React.useState<{ text: string, type: 'positive' | 'neutral' | 'warning' } | null>(null);

  React.useEffect(() => {
    // We only want to update this once per session or when major data changes, 
    // but the user said "automatically when user login, but not update too frequently"
    // We can use session storage to cache it for the current session.
    const cached = sessionStorage.getItem('spendwise_visionary_forecast');
    if (cached) {
      setForecast(JSON.parse(cached));
      return;
    }

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
    neutral: "from-indigo-500/10 to-purple-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400",
    warning: "from-rose-500/10 to-amber-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
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
      className={`relative overflow-hidden rounded-[2rem] border bg-gradient-to-br transition-all p-6 ${colors[forecast.type]}`}
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 rotate-12">
        <Sparkles className="h-24 w-24" />
      </div>
      
      <div className="relative z-10 flex items-center gap-4">
        <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 shadow-xl border border-current opacity-80`}>
          {icons[forecast.type]}
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Visionary Forecast</h4>
          <p className="text-sm font-bold tracking-tight leading-relaxed">
            {forecast.text}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
