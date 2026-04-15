import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Expense, Due, Salary } from '../types';
import { format, parseISO, isSameDay } from 'date-fns';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Wallet, Receipt, CalendarClock } from 'lucide-react';
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

  const dayEvents = useMemo(() => {
    if (!selectedDate) return { expenses: [], dues: [], salaries: [] };
    
    return {
      expenses: expenses.filter(e => isSameDay(parseISO(e.date), selectedDate)),
      dues: dues.filter(d => {
        const dueDate = parseISO(d.dueDate);
        if (isSameDay(dueDate, selectedDate)) return true;
        if (d.isRecurring) {
          // Check if it's the same day of the month AND selectedDate is after or same as dueDate
          const isAfterStart = selectedDate >= dueDate;
          const isBeforeEnd = !d.repeatUntil || selectedDate <= parseISO(d.repeatUntil);
          return isAfterStart && isBeforeEnd && dueDate.getDate() === selectedDate.getDate();
        }
        return false;
      }),
      salaries: salaries.filter(s => {
        const salaryDate = parseISO(s.date);
        if (isSameDay(salaryDate, selectedDate)) return true;
        if (s.isRecurring) {
          const isAfterStart = selectedDate >= salaryDate;
          const isBeforeEnd = !s.repeatUntil || selectedDate <= parseISO(s.repeatUntil);
          return isAfterStart && isBeforeEnd && salaryDate.getDate() === selectedDate.getDate();
        }
        return false;
      })
    };
  }, [selectedDate, expenses, dues, salaries]);

  const modifiers = {
    expense: (date: Date) => expenses.some(e => isSameDay(parseISO(e.date), date)),
    due: (date: Date) => dues.some(d => {
      const dueDate = parseISO(d.dueDate);
      if (isSameDay(dueDate, date)) return true;
      if (d.isRecurring) {
        const isAfterStart = date >= dueDate;
        const isBeforeEnd = !d.repeatUntil || date <= parseISO(d.repeatUntil);
        return isAfterStart && isBeforeEnd && dueDate.getDate() === date.getDate();
      }
      return false;
    }),
    salary: (date: Date) => salaries.some(s => {
      const salaryDate = parseISO(s.date);
      if (isSameDay(salaryDate, date)) return true;
      if (s.isRecurring) {
        const isAfterStart = date >= salaryDate;
        const isBeforeEnd = !s.repeatUntil || date <= parseISO(s.repeatUntil);
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12 max-w-5xl mx-auto">
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
            <div className="p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full max-w-sm"
                captionLayout="dropdown"
                modifiers={modifiers}
                modifiersStyles={modifierStyles}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-zinc-200 shadow-sm flex flex-col bg-white h-fit">
          <CardHeader className="border-b border-zinc-50 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
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
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-8">
              {/* Salaries */}
              {dayEvents.salaries.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                    <Wallet className="h-3 w-3" /> Income
                  </h4>
                  {dayEvents.salaries.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-emerald-50/50 p-3 border border-emerald-100">
                      <span className="text-sm font-medium">{s.description}</span>
                      <span className="font-bold text-emerald-700">+{formatAmount(s.amount, s.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dues */}
              {dayEvents.dues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                    <CalendarClock className="h-3 w-3" /> Dues
                  </h4>
                  {dayEvents.dues.map(d => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-amber-50/50 p-3 border border-amber-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{d.description}</span>
                        <Badge variant="outline" className="w-fit text-[10px] mt-1">{d.category}</Badge>
                      </div>
                      <span className="font-bold text-amber-700">{formatAmount(d.amount, d.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expenses */}
              {dayEvents.expenses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                    <Receipt className="h-3 w-3" /> Expenses
                  </h4>
                  {dayEvents.expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg bg-rose-50/50 p-3 border border-rose-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{e.description}</span>
                        <Badge variant="outline" className="w-fit text-[10px] mt-1">{e.category}</Badge>
                      </div>
                      <span className="font-bold text-rose-700">{formatAmount(e.amount, e.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {dayEvents.salaries.length === 0 && dayEvents.dues.length === 0 && dayEvents.expenses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
                  <p className="text-sm">No transactions for this day</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  </div>
  );
}
