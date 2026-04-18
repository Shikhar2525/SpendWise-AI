import { format, parseISO, startOfMonth, addMonths, subYears, addYears, getYear } from 'date-fns';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { CalendarClock, Calendar, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface MonthFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  suggestions: string[];
}

export function MonthFilter({ selectedMonth, onMonthChange, suggestions }: MonthFilterProps) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const isViewingCurrent = selectedMonth === currentMonth;
  const [isOpen, setIsOpen] = useState(false);
  
  // Use a local state for the picker's viewing year
  const [viewingYear, setViewingYear] = useState(() => parseInt(selectedMonth.split('-')[0]));

  // Sync viewing year when selected month changes from external props (suggestions, etc)
  useEffect(() => {
    setViewingYear(parseInt(selectedMonth.split('-')[0]));
  }, [selectedMonth]);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const handleMonthSelect = (monthIndex: number) => {
    const nextMonth = `${viewingYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    onMonthChange(nextMonth);
    setIsOpen(false);
  };

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
          {!suggestions.includes(currentMonth) && (
             <Button
               variant="ghost"
               size="sm"
               onClick={() => onMonthChange(currentMonth)}
               className={cn(
                 "rounded-lg px-3 h-8 text-[9px] font-black uppercase tracking-[0.1em] transition-all gap-1.5",
                 isViewingCurrent 
                   ? 'bg-emerald-600 text-white shadow-md font-black italic' 
                   : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
               )}
             >
               <Zap className="h-3 w-3 fill-current" /> Today
             </Button>
          )}
          {suggestions.slice(-3).map(m => {
            const isCurrentInList = m === currentMonth;
            return (
              <Button
                key={m}
                variant="ghost"
                size="sm"
                onClick={() => onMonthChange(m)}
                className={cn(
                  "rounded-lg px-4 h-8 text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                  selectedMonth === m 
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800' 
                    : isCurrentInList
                      ? 'text-emerald-600 hover:text-emerald-700'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-900'
                )}
              >
                {format(parseISO(`${m}-01`), 'MMM yy')}
              </Button>
            );
          })}
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:border-zinc-800 hidden sm:block mx-1" />

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger className="group relative flex items-center gap-3 h-10 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-zinc-200 dark:shadow-none overflow-hidden outline-none">
            <Calendar className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest">{format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}</span>
              {isViewingCurrent && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setViewingYear(prev => prev - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white italic">
                  {viewingYear}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setViewingYear(prev => prev + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {months.map((m, i) => {
                  const mStr = `${viewingYear}-${String(i + 1).padStart(2, '0')}`;
                  const isSelected = selectedMonth === mStr;
                  const isCurrent = currentMonth === mStr;
                  
                  return (
                    <Button
                      key={m}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMonthSelect(i)}
                      className={cn(
                        "h-9 text-[10px] font-bold uppercase tracking-tight rounded-xl transition-all",
                        isSelected 
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg' 
                          : isCurrent
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white'
                      )}
                    >
                      {m}
                    </Button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button 
                  variant="ghost" 
                  className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  onClick={() => {
                    const today = new Date();
                    setViewingYear(today.getFullYear());
                    onMonthChange(format(today, 'yyyy-MM'));
                    setIsOpen(false);
                  }}
                >
                  Jump to Today
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
