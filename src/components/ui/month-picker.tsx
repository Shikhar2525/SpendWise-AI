import { format, parseISO, startOfMonth, addMonths, subYears, addYears, getYear } from 'date-fns';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
  minDate?: string; // YYYY-MM
  placeholder?: string;
  className?: string;
}

export function MonthPicker({ value, onChange, minDate, placeholder = "Select month", className }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  // Use a local state for the picker's viewing year
  const [viewingYear, setViewingYear] = useState(() => {
    const month = value || currentMonth;
    return parseInt(month.split('-')[0]);
  });

  // Sync viewing year when value changes externally
  useEffect(() => {
    if (value) {
      setViewingYear(parseInt(value.split('-')[0]));
    }
  }, [value]);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const handleMonthSelect = (monthIndex: number) => {
    const nextMonth = `${viewingYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    if (minDate && nextMonth < minDate) return;
    onChange(nextMonth);
    setIsOpen(false);
  };

  const displayValue = value ? format(parseISO(`${value}-01`), 'MMMM, yyyy') : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn(
          "w-full flex items-center justify-start text-left font-normal bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 cursor-pointer outline-none hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
          !value && "text-zinc-500",
          className
        )}
      >
        <Calendar className="mr-2 h-4 w-4 opacity-50" />
        <span className="text-sm font-medium">{displayValue}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50">
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
              const isSelected = value === mStr;
              const isCurrent = currentMonth === mStr;
              const isDisabled = minDate ? mStr < minDate : false;
              
              return (
                <Button
                  key={m}
                  variant="ghost"
                  size="sm"
                  disabled={isDisabled}
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
                onChange(format(today, 'yyyy-MM'));
                setIsOpen(false);
              }}
            >
              Current Month
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
