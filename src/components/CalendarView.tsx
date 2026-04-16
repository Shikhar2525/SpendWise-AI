import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Expense, Due, Salary } from '../types';
import { format, parseISO, isSameDay } from 'date-fns';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Wallet, Receipt, CalendarClock, Calendar as CalendarIcon } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

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
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const events: { date: Date, type: 'expense' | 'due' | 'salary', description: string, amount: number, currency: string, category?: string }[] = [];

    // Add non-recurring
    expenses.forEach(e => {
      const d = parseISO(e.date);
      if (d >= today && d <= thirtyDaysFromNow) {
        events.push({ date: d, type: 'expense', description: e.description, amount: e.amount, currency: e.currency, category: e.category });
      }
    });

    dues.forEach(d => {
      const dueDate = parseISO(d.dueDate);
      if (!d.isRecurring) {
        if (dueDate >= today && dueDate <= thirtyDaysFromNow) {
          events.push({ date: dueDate, type: 'due', description: d.description, amount: d.amount, currency: d.currency, category: d.category });
        }
      } else {
        // For recurring, find occurrences in the next 30 days
        let current = new Date(today);
        while (current <= thirtyDaysFromNow) {
          if (current.getDate() === dueDate.getDate() && current >= dueDate && (!d.repeatUntil || current <= parseISO(d.repeatUntil))) {
            events.push({ date: new Date(current), type: 'due', description: d.description, amount: d.amount, currency: d.currency, category: d.category });
          }
          current.setDate(current.getDate() + 1);
        }
      }
    });

    salaries.forEach(s => {
      const salaryDate = parseISO(s.date);
      if (!s.isRecurring) {
        if (salaryDate >= today && salaryDate <= thirtyDaysFromNow) {
          events.push({ date: salaryDate, type: 'salary', description: s.description, amount: s.amount, currency: s.currency });
        }
      } else {
        let current = new Date(today);
        while (current <= thirtyDaysFromNow) {
          if (current.getDate() === salaryDate.getDate() && current >= salaryDate && (!s.repeatUntil || current <= parseISO(s.repeatUntil))) {
            events.push({ date: new Date(current), type: 'salary', description: s.description, amount: s.amount, currency: s.currency });
          }
          current.setDate(current.getDate() + 1);
        }
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [expenses, dues, salaries]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-12 max-w-6xl mx-auto">
        <Card className="lg:col-span-7 border-zinc-200 shadow-sm overflow-hidden h-fit">
          <CardContent className="p-0">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Financial Calendar</h3>
                <p className="text-xs text-zinc-500">Income and expenses</p>
              </div>
              <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1 text-emerald-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Income
                </div>
                <div className="flex items-center gap-1 text-rose-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Expense
                </div>
                <div className="flex items-center gap-1 text-amber-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Due
                </div>
              </div>
            </div>
            <div className="p-4 flex justify-center">
              <Calendar
                mode="single"
                month={month}
                onMonthChange={handleMonthChange}
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full"
                captionLayout="dropdown"
                modifiers={modifiers}
                modifiersStyles={modifierStyles}
              />
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-zinc-900">Upcoming (Next 30 Days)</h3>
        <Badge variant="secondary" className="bg-zinc-100 text-zinc-600">{upcomingEvents.length} Events</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcomingEvents.slice(0, 6).map((event, i) => (
          <Card key={i} className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${
                  event.type === 'salary' ? 'bg-emerald-100 text-emerald-700' :
                  event.type === 'due' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {event.type === 'salary' ? <Wallet className="h-4 w-4" /> :
                   event.type === 'due' ? <CalendarClock className="h-4 w-4" /> :
                   <Receipt className="h-4 w-4" />}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{format(event.date, 'MMM dd')}</p>
                  <p className="text-sm font-black text-zinc-900">
                    {event.type === 'salary' ? '+' : ''}{formatAmount(event.amount, event.currency)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 truncate">{event.description}</p>
                {event.category && <p className="text-[10px] text-zinc-500">{event.category}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {upcomingEvents.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
            <p className="text-sm text-zinc-400">No upcoming events found</p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
