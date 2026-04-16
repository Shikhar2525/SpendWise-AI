import { format, parseISO } from 'date-fns';
import { Button } from './ui/button';
import { CalendarClock } from 'lucide-react';

interface MonthFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  suggestions: string[];
}

export function MonthFilter({ selectedMonth, onMonthChange, suggestions }: MonthFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center">
          <CalendarClock className="h-4 w-4 text-white dark:text-black" />
        </div>
        <span className="text-sm font-bold text-zinc-900 dark:text-white">Period Filter</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(-3).map(m => (
            <Button
              key={m}
              variant={selectedMonth === m ? "default" : "outline"}
              size="sm"
              onClick={() => onMonthChange(m)}
              className={`rounded-full px-4 h-9 min-w-[100px] text-[10px] font-bold uppercase tracking-wider transition-all border-none ${
                selectedMonth === m ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {format(parseISO(`${m}-01`), 'MMM yyyy')}
            </Button>
          ))}
        </div>
        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block mx-1" />
        <div className="relative group">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-9 w-[150px] rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 text-[11px] font-bold uppercase focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all hover:border-zinc-400 cursor-pointer shadow-sm text-zinc-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
