import React, { useState, useMemo } from 'react';
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
      dues: dues.filter(d => isSameDay(parseISO(d.dueDate), selectedDate)),
      salaries: salaries.filter(s => isSameDay(parseISO(s.date), selectedDate))
    };
  }, [selectedDate, expenses, dues, salaries]);

  const modifiers = {
    expense: (date: Date) => expenses.some(e => isSameDay(parseISO(e.date), date)),
    due: (date: Date) => dues.some(d => isSameDay(parseISO(d.dueDate), date)),
    salary: (date: Date) => salaries.some(s => isSameDay(parseISO(s.date), date))
  };

  const modifierStyles = {
    expense: { borderBottom: '2px solid #f43f5e' },
    due: { borderBottom: '2px solid #f59e0b' },
    salary: { borderBottom: '2px solid #10b981' }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border-0"
            modifiers={modifiers}
            modifiersStyles={modifierStyles}
          />
          <div className="mt-4 flex flex-wrap gap-4 px-4 text-xs font-medium text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Income
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Expense
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Due
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 shadow-sm flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
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
  );
}
