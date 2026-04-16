import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Calendar } from './ui/calendar';
import { Expense, Due, Salary } from '../types';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Wallet, Receipt, CalendarClock, Calendar as CalendarIcon, Filter, ArrowRight, Settings2, Info } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { Logo } from './Logo';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  data: {
    expenses: Expense[];
    dues: Due[];
    salaries: Salary[];
    loading: boolean;
  };
}

export default function CalendarView({ data }: CalendarViewProps) {
  const { expenses, dues, salaries } = data;
  const { formatAmount } = useCurrency();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [rangeDays, setRangeDays] = useState('30');
  const [customRange, setCustomRange] = useState('');

  const displayRange = useMemo(() => {
    if (rangeDays === 'custom') {
      return parseInt(customRange) || 30;
    }
    return parseInt(rangeDays);
  }, [rangeDays, customRange]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return { expenses: [], dues: [], salaries: [] };
    
    // Normalize to compare dates without time issues
    const compareDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    
    return {
      expenses: expenses.filter(e => {
        const d = parseISO(e.date);
        return isSameDay(new Date(d.getFullYear(), d.getMonth(), d.getDate()), compareDate);
      }),
      dues: dues.filter(d => {
        const dDate = parseISO(d.dueDate);
        const dueDate = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
        if (isSameDay(dueDate, compareDate)) return true;
        if (d.isRecurring) {
          const isAfterStart = compareDate >= dueDate;
          let isBeforeEnd = true;
          if (d.repeatUntil) {
            const rEnd = parseISO(d.repeatUntil);
            const repeatUntilDate = new Date(rEnd.getFullYear(), rEnd.getMonth(), rEnd.getDate());
            isBeforeEnd = compareDate <= repeatUntilDate;
          }
          return isAfterStart && isBeforeEnd && dueDate.getDate() === compareDate.getDate();
        }
        return false;
      }),
      salaries: salaries.filter(s => {
        const sDate = parseISO(s.date);
        const salaryDate = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
        if (isSameDay(salaryDate, compareDate)) return true;
        if (s.isRecurring) {
          const isAfterStart = compareDate >= salaryDate;
          let isBeforeEnd = true;
          if (s.repeatUntil) {
            const rEnd = parseISO(s.repeatUntil);
            const repeatUntilDate = new Date(rEnd.getFullYear(), rEnd.getMonth(), rEnd.getDate());
            isBeforeEnd = compareDate <= repeatUntilDate;
          }
          return isAfterStart && isBeforeEnd && salaryDate.getDate() === compareDate.getDate();
        }
        return false;
      })
    };
  }, [selectedDate, expenses, dues, salaries]);

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth);
    // When month changes, if the selected date is not in that month, default to 1st of that month
    if (selectedDate && (selectedDate.getMonth() !== newMonth.getMonth() || selectedDate.getFullYear() !== newMonth.getFullYear())) {
      setSelectedDate(newMonth);
    }
  };

  const modifiers = {
    expense: (date: Date) => expenses.some(e => {
      const d = parseISO(e.date);
      return isSameDay(new Date(d.getFullYear(), d.getMonth(), d.getDate()), date);
    }),
    due: (date: Date) => dues.some(d => {
      const dDate = parseISO(d.dueDate);
      const dueDate = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
      if (isSameDay(dueDate, date)) return true;
      if (d.isRecurring) {
        const isAfterStart = date >= dueDate;
        let isBeforeEnd = true;
        if (d.repeatUntil) {
          const rEnd = parseISO(d.repeatUntil);
          const repeatUntilDate = new Date(rEnd.getFullYear(), rEnd.getMonth(), rEnd.getDate());
          isBeforeEnd = date <= repeatUntilDate;
        }
        return isAfterStart && isBeforeEnd && dueDate.getDate() === date.getDate();
      }
      return false;
    }),
    salary: (date: Date) => salaries.some(s => {
      const sDate = parseISO(s.date);
      const salaryDate = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
      if (isSameDay(salaryDate, date)) return true;
      if (s.isRecurring) {
        const isAfterStart = date >= salaryDate;
        let isBeforeEnd = true;
        if (s.repeatUntil) {
          const rEnd = parseISO(s.repeatUntil);
          const repeatUntilDate = new Date(rEnd.getFullYear(), rEnd.getMonth(), rEnd.getDate());
          isBeforeEnd = date <= repeatUntilDate;
        }
        return isAfterStart && isBeforeEnd && salaryDate.getDate() === date.getDate();
      }
      return false;
    })
  };

  const modifierStyles = {
    expense: { borderBottom: '2px solid #f43f5e' },
    due: { borderBottom: '2px solid #f59e0b' },
    salary: { borderBottom: '2px solid #10b981' }
  };

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeEnd = addDays(today, displayRange);

    const events: { date: Date, type: 'expense' | 'due' | 'salary', description: string, amount: number, currency: string, category?: string, isRecurring?: boolean }[] = [];

    // Add non-recurring
    expenses.forEach(e => {
      const d = parseISO(e.date);
      if (d >= today && d <= rangeEnd) {
        events.push({ date: d, type: 'expense', description: e.description, amount: e.amount, currency: e.currency, category: e.category });
      }
    });

    dues.forEach(d => {
      const dueDate = parseISO(d.dueDate);
      if (!d.isRecurring) {
        if (dueDate >= today && dueDate <= rangeEnd) {
          events.push({ date: dueDate, type: 'due', description: d.description, amount: d.amount, currency: d.currency, category: d.category });
        }
      } else {
        // For recurring, find occurrences in the range
        let current = new Date(dueDate);
        while (current <= rangeEnd) {
          if (current >= today) {
            if (!d.repeatUntil || current <= parseISO(d.repeatUntil)) {
              events.push({ date: new Date(current), type: 'due', description: d.description, amount: d.amount, currency: d.currency, category: d.category, isRecurring: true });
            }
          }
          current.setMonth(current.getMonth() + 1);
        }
      }
    });

    salaries.forEach(s => {
      const salaryDate = parseISO(s.date);
      if (!s.isRecurring) {
        if (salaryDate >= today && salaryDate <= rangeEnd) {
          events.push({ date: salaryDate, type: 'salary', description: s.description, amount: s.amount, currency: s.currency });
        }
      } else {
        let current = new Date(salaryDate);
        while (current <= rangeEnd) {
          if (current >= today) {
            if (!s.repeatUntil || current <= parseISO(s.repeatUntil)) {
              events.push({ date: new Date(current), type: 'salary', description: s.description, amount: s.amount, currency: s.currency, isRecurring: true });
            }
          }
          current.setMonth(current.getMonth() + 1);
        }
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [expenses, dues, salaries, displayRange]);

  // Custom Day rendering to show markers
  const DayMarkers = ({ date }: { date: Date }) => {
    const hasSalary = modifiers.salary(date);
    const hasExpense = modifiers.expense(date);
    const hasDue = modifiers.due(date);

    if (!hasSalary && !hasExpense && !hasDue) return null;

    return (
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
        {hasSalary && <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_2px_rgba(16,185,129,0.5)]" />}
        {hasDue && <div className="h-1 w-1 rounded-full bg-amber-500 shadow-[0_0_2px_rgba(245,158,11,0.5)]" />}
        {hasExpense && <div className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_2px_rgba(244,63,94,0.5)]" />}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-12 max-w-6xl mx-auto">
        <Card className="lg:col-span-7 border-zinc-200 shadow-xl shadow-zinc-200/50 overflow-hidden h-fit bg-white">
          <CardContent className="p-0">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo className="h-9 w-9" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 leading-tight tracking-tight">Financial Strategy View</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Global Cashflow Mapping</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const today = new Date();
                    setMonth(today);
                    setSelectedDate(today);
                  }}
                  className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white border-zinc-200"
                >
                  Today
                </Button>
                <div className="hidden sm:flex gap-3 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl shadow-inner">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase">Input</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase">Output</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 flex justify-center bg-white">
              <Calendar
                mode="single"
                month={month}
                onMonthChange={handleMonthChange}
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full max-w-md mx-auto"
                captionLayout="dropdown"
                modifiers={modifiers}
                components={{
                  DayButton: ({ day, className, ...props }) => {
                    const isToday = isSameDay(day.date, new Date());
                    const isSelected = selectedDate && isSameDay(day.date, selectedDate);
                    
                    return (
                      <button
                        {...props}
                        className={cn(
                          "relative h-10 w-10 md:h-12 md:w-12 p-0 font-bold transition-all duration-200 rounded-2xl flex items-center justify-center text-sm",
                          isSelected ? "bg-zinc-900 text-white shadow-lg scale-110 z-10" : "hover:bg-zinc-100",
                          isToday && !isSelected && "bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200 ring-offset-2",
                          "group/day"
                        )}
                      >
                        <span className="relative z-10">{day.date.getDate()}</span>
                        <DayMarkers date={day.date} />
                        {isSelected && (
                          <motion.div 
                            layoutId="calendar-selection"
                            className="absolute inset-0 bg-zinc-900 rounded-2xl"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    );
                  }
                }}
              />
            </div>
            <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-center gap-6">
               <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Income</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-amber-500" />
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Dues</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-rose-500" />
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Expenses</span>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-zinc-200 shadow-sm flex flex-col bg-white">
          <CardHeader className="border-b border-zinc-50 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-200">
                <span className="text-xs font-bold uppercase">{selectedDate ? format(selectedDate, 'MMM') : ''}</span>
                <span className="text-xl font-black leading-none">{selectedDate ? format(selectedDate, 'dd') : ''}</span>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  {selectedDate ? format(selectedDate, 'EEEE') : 'Select a date'}
                </CardTitle>
                <p className="text-xs text-zinc-400 font-medium">{selectedDate ? format(selectedDate, 'yyyy') : ''}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pt-6">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
              {/* Salaries */}
              {dayEvents.salaries.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                    <Wallet className="h-3 w-3" /> Income
                  </h4>
                  {dayEvents.salaries.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-emerald-50/30 p-3 border border-emerald-100/50">
                      <span className="text-sm font-medium text-zinc-900">{s.description}</span>
                      <span className="font-bold text-emerald-700">+{formatAmount(s.amount, s.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dues */}
              {dayEvents.dues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                    <CalendarClock className="h-3 w-3" /> Dues
                  </h4>
                  {dayEvents.dues.map(d => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl bg-amber-50/30 p-3 border border-amber-100/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-900">{d.description}</span>
                        <Badge variant="outline" className="w-fit text-[9px] mt-1 bg-white/50">{d.category}</Badge>
                      </div>
                      <span className="font-bold text-amber-700">{formatAmount(d.amount, d.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expenses */}
              {dayEvents.expenses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                    <Receipt className="h-3 w-3" /> Expenses
                  </h4>
                  {dayEvents.expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl bg-rose-50/30 p-3 border border-rose-100/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-900">{e.description}</span>
                        <Badge variant="outline" className="w-fit text-[9px] mt-1 bg-white/50">{e.category}</Badge>
                      </div>
                      <span className="font-bold text-rose-700">{formatAmount(e.amount, e.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {dayEvents.salaries.length === 0 && dayEvents.dues.length === 0 && dayEvents.expenses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-12 w-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 mb-3">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-zinc-500">No transactions for this day</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>

    {/* Upcoming Events Section */}
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-zinc-900 tracking-tight">Upcoming Schedule</h3>
          <p className="text-sm text-zinc-500">Track your future transactions and plan ahead</p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-xl border border-zinc-100">
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[140px] h-9 border-0 bg-transparent shadow-none focus:ring-0">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />
                <SelectValue placeholder="Period" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Next 7 Days</SelectItem>
              <SelectItem value="15">Next 15 Days</SelectItem>
              <SelectItem value="30">Next 30 Days</SelectItem>
              <SelectItem value="90">Next 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {rangeDays === 'custom' && (
            <div className="flex items-center gap-2 px-2 border-l border-zinc-200 ml-1">
              <Input 
                type="number" 
                placeholder="Days" 
                className="h-8 w-16 text-xs bg-white border-zinc-200"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
              />
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Days</span>
            </div>
          )}
          
          <Badge variant="secondary" className="h-7 bg-white text-zinc-600 border border-zinc-100 shadow-sm ml-2">
            {upcomingEvents.length} Events
          </Badge>
        </div>
      </div>

      {upcomingEvents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {upcomingEvents.map((event, i) => (
            <Card key={i} className="group border-zinc-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white overflow-hidden">
              <div className={`h-1 w-full ${
                event.type === 'salary' ? 'bg-emerald-500' :
                event.type === 'due' ? 'bg-amber-500' :
                'bg-rose-500'
              }`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl shadow-sm ${
                    event.type === 'salary' ? 'bg-emerald-50 text-emerald-600' :
                    event.type === 'due' ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {event.type === 'salary' ? <Wallet className="h-5 w-5" /> :
                     event.type === 'due' ? <CalendarClock className="h-5 w-5" /> :
                     <Receipt className="h-5 w-5" />}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{format(event.date, 'EEEE')}</p>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-zinc-900">{format(event.date, 'MMM dd')}</span>
                      <span className="text-[10px] text-zinc-400">{format(event.date, 'yyyy')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 line-clamp-1">{event.description}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {event.category && (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter bg-zinc-50/50 border-zinc-200">
                            {event.category}
                          </Badge>
                        )}
                        {event.isRecurring && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100 uppercase italic">
                                  Recurring
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">This transaction repeats monthly</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-zinc-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amount</span>
                    <span className={`text-base font-black ${
                      event.type === 'salary' ? 'text-emerald-600' :
                      event.type === 'due' ? 'text-amber-600' :
                      'text-rose-600'
                    }`}>
                      {event.type === 'salary' ? '+' : ''}{formatAmount(event.amount, event.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-zinc-100 rounded-[2rem] bg-zinc-50/30">
          <div className="h-20 w-20 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-200 mb-6">
            <CalendarIcon className="h-10 w-10 opacity-20" />
          </div>
          <h4 className="text-lg font-bold text-zinc-900">No events in this period</h4>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-1">Try extending the range or check back later for new transactions.</p>
        </div>
      )}
    </div>
  </div>
  );
}
