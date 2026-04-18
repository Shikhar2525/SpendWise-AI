import { format, parseISO } from 'date-fns';
import { useRef } from 'react';
import { Button } from './ui/button';
import { CalendarClock, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface MonthFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  suggestions: string[];
}

export function MonthFilter({ selectedMonth, onMonthChange, suggestions }: MonthFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded-2xl shadow-sm mb-4">
      <div className="flex items-center gap-3 px-3">
        <div className="h-8 w-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center">
          <CalendarClock className="h-4 w-4 text-white dark:text-black" />
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none">Filter By</span>
          <span className="text-xs font-black uppercase italic tracking-tight text-zinc-900 dark:text-white mt-0.5">Month</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pr-1">
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          {suggestions.slice(-3).map(m => (
            <Button
              key={m}
              variant="ghost"
              size="sm"
              onClick={() => onMonthChange(m)}
              className={cn(
                "rounded-lg px-4 h-8 text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                selectedMonth === m 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-900'
              )}
            >
              {format(parseISO(`${m}-01`), 'MMM yy')}
            </Button>
          ))}
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:border-zinc-800 hidden sm:block mx-1" />

        <div className="group relative flex items-center gap-3 h-10 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] transition-all shadow-lg shadow-zinc-200 dark:shadow-none overflow-hidden cursor-pointer active:scale-95">
          <Calendar className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-black uppercase tracking-widest">{format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}</span>
          <input 
            ref={inputRef}
            type="month" 
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            onClick={(e) => {
              try {
                if ('showPicker' in e.currentTarget) {
                  (e.currentTarget as any).showPicker();
                }
              } catch (err) {}
            }}
            className="absolute inset-0 opacity-0 cursor-pointer z-50 w-full h-full"
            title="Select month"
            tabIndex={-1}
          />
        </div>
      </div>
    </div>
  );
}
