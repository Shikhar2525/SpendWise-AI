import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress, ProgressIndicator, ProgressTrack } from './ui/progress';
import { Budget, Expense, CATEGORIES, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Logo } from './Logo';
import { Trash2, Edit, Plus, PieChart, AlertCircle, Target, Layers, CalendarCheck, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from './ui/confirm-dialog';
import { cn } from '../lib/utils';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';

import { MonthPicker } from './ui/month-picker';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface BudgetsViewProps {
  data: {
    budgets: Budget[];
    expenses: Expense[];
    loading: boolean;
  };
}

export default function BudgetsView({ data }: BudgetsViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount, convert } = useCurrency();
  const { selectedMonth } = useFinancialPeriod();
  const { budgets, expenses } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteChoiceId, setDeleteChoiceId] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [recurringChoiceId, setRecurringChoiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: 'Food' as Budget['category'],
    limit: '',
    currency: preferredCurrency.code,
    startMonth: selectedMonth,
    endMonth: '',
    isRecurring: false
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, startMonth: selectedMonth }));
  }, [selectedMonth]);

  useEffect(() => {
    if (!editingBudget) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingBudget]);

  const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
  const monthEnd = endOfMonth(parseISO(`${selectedMonth}-01`));

  const filteredBudgets = useMemo(() => {
    const allMatches = budgets.filter(b => {
      const start = b.startMonth || b.month;
      const end = b.endMonth;
      
      // Check exclusion
      if (b.excludedMonths?.includes(selectedMonth)) return false;

      if (b.isRecurring && !end) return selectedMonth >= start;
      if (!end) return start === selectedMonth;
      
      return selectedMonth >= start && selectedMonth <= end;
    });

    // Group by category to find overrides
    const grouped = allMatches.reduce((acc, b) => {
      if (!acc[b.category]) acc[b.category] = [];
      acc[b.category].push(b);
      return acc;
    }, {} as Record<string, Budget[]>);

    return Object.values(grouped).map(group => {
      // 1. Prefer non-recurring exact month matches (overrides)
      const exactOverride = group.find(b => !b.isRecurring && (b.startMonth || b.month) === selectedMonth && (b.endMonth === selectedMonth || !b.endMonth));
      if (exactOverride) return exactOverride;

      // 2. Prefer specific range matches
      const rangeMatch = group.find(b => b.startMonth && b.endMonth && b.startMonth !== b.endMonth);
      if (rangeMatch) return rangeMatch;

      // 3. Finally recurring
      return group.find(b => b.isRecurring) || group[0];
    });
  }, [budgets, selectedMonth]);

  const budgetProgress = useMemo(() => {
    return filteredBudgets.map(budget => {
      const spent = expenses
        .filter(e => e.category === budget.category && isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }))
        .reduce((sum, e) => {
          const convertedAmount = convert(e.amount, e.currency || 'USD', budget.currency || 'USD');
          return sum + convertedAmount;
        }, 0);
      
      const percentage = (spent / budget.limit) * 100;
      return { ...budget, spent, percentage };
    });
  }, [filteredBudgets, expenses, monthStart, monthEnd, convert]);

  const openAddDialog = () => {
    setEditingBudget(null);
    setFormData({
      category: 'Food',
      limit: '',
      currency: preferredCurrency.code,
      startMonth: selectedMonth,
      endMonth: '',
      isRecurring: false
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    if (budget.isRecurring && !recurringChoiceId) {
       setRecurringChoiceId(budget.id);
       return;
    }

    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit.toString(),
      currency: budget.currency || 'USD',
      startMonth: budget.startMonth || budget.month,
      endMonth: budget.endMonth || '',
      isRecurring: budget.isRecurring || false
    });
    setIsDialogOpen(true);
  };

  const handleEditThisMonthOnly = (budget: Budget) => {
    setEditingBudget(null); // Creating a new override
    setFormData({
      category: budget.category,
      limit: budget.limit.toString(),
      currency: budget.currency || 'USD',
      startMonth: selectedMonth,
      endMonth: selectedMonth,
      isRecurring: false
    });
    setRecurringChoiceId(null);
    setIsDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!user) return;
    if (!formData.limit) {
      toast.error('Please enter a limit');
      return;
    }

    try {
      const budgetData = {
        uid: user.uid,
        category: formData.category,
        limit: parseFloat(formData.limit),
        currency: formData.currency,
        month: formData.startMonth, // Backwards compatibility
        startMonth: formData.startMonth,
        endMonth: formData.endMonth || null,
        isRecurring: formData.isRecurring,
        updatedAt: new Date().toISOString()
      };

      if (editingBudget) {
        await updateDoc(doc(db, 'budgets', editingBudget.id), budgetData);
        toast.success('Budget updated successfully');
      } else {
        await addDoc(collection(db, 'budgets'), {
          ...budgetData,
          createdAt: new Date().toISOString()
        });
        toast.success('Budget limit set');
      }
      setIsDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingBudget ? OperationType.UPDATE : OperationType.CREATE, 'budgets');
    }
  };

  const handleDeleteBudget = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'budgets', deleteConfirmId));
      toast.success('Budget series removed');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleDeleteThisMonthOnly = async (budget: Budget) => {
    try {
      const updatedExcluded = [...(budget.excludedMonths || []), selectedMonth];
      await updateDoc(doc(db, 'budgets', budget.id), {
        excludedMonths: updatedExcluded,
        updatedAt: new Date().toISOString()
      });
      toast.success('Budget removed for this month only');
      setDeleteChoiceId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Budgets</h2>
              <Logo className="h-5 w-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Set limits and track your spending</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isDialogOpen && (
            <Button onClick={openAddDialog} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 gap-2 h-10 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-none font-bold uppercase tracking-widest text-[10px]">
              <Plus className="h-4 w-4" />
              Set Limit
            </Button>
          )}
        </div>
      </div>

      {isDialogOpen && (
        <Card className="border-none shadow-2xl bg-white dark:bg-zinc-950 rounded-[2.5rem] overflow-hidden group">
          <div className="h-1.5 w-full bg-indigo-600 dark:bg-indigo-500 opacity-60" />
          <CardHeader className="p-8 pb-0">
             <CardTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
               <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                 <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
               </div>
               {editingBudget ? 'Adjust Constraint' : 'New Strategic Limit'}
             </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Asset Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger className="h-12 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-4 text-xs font-bold uppercase tracking-tight shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase tracking-widest">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Limit Threshold</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      placeholder="0.00"
                      className="h-12 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-4 text-sm font-black italic tracking-widest shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-all"
                      value={formData.limit}
                      onChange={(e) => setFormData({...formData, limit: e.target.value})}
                    />
                    <Select 
                      value={formData.currency} 
                      onValueChange={(v) => setFormData({...formData, currency: v})}
                    >
                      <SelectTrigger className="w-24 h-12 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-4 text-[10px] font-black tracking-widest shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code} className="text-[10px] font-black tracking-widest">{c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Duration Window</Label>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 block">Initialize</span>
                        <MonthPicker 
                          value={formData.startMonth}
                          onChange={(v) => setFormData({...formData, startMonth: v})}
                          className="h-12 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-4 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 block">Terminate</span>
                        <MonthPicker 
                          value={formData.endMonth}
                          onChange={(v) => setFormData({...formData, endMonth: v})}
                          minDate={formData.startMonth}
                          placeholder="Ongoing"
                          className="h-12 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-4 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 group/check cursor-pointer" onClick={() => setFormData({...formData, isRecurring: !formData.isRecurring})}>
                   <div className={cn(
                     "h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all",
                     formData.isRecurring ? "bg-indigo-600 border-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]" : "border-zinc-200 dark:border-zinc-800 bg-transparent"
                   )}>
                     {formData.isRecurring && <Plus className="h-3 w-3 text-white rotate-45" />}
                   </div>
                   <input type="checkbox" checked={formData.isRecurring} readOnly className="sr-only" />
                   <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer leading-none">Automate Monthly Recurrence</Label>
                </div>
              </div>

              <div className="flex flex-col justify-end gap-3">
                <Button className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-all rounded-[1.5rem] shadow-xl shadow-zinc-200 dark:shadow-none text-[10px] font-black uppercase tracking-[0.2em] italic group" onClick={handleSaveBudget}>
                  {editingBudget ? 'Synchronize Updates' : 'Commit Budget Limit'}
                  <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Button>
                <Button variant="ghost" className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors" onClick={() => setIsDialogOpen(false)}>
                  Disconnect
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {budgetProgress.length > 0 ? (
          budgetProgress.map((budget) => (
            <Card key={budget.id} className="border-none shadow-2xl bg-white dark:bg-zinc-950 rounded-[2.5rem] overflow-hidden group transition-all hover:scale-[1.01] active:scale-[0.99]">
              <CardHeader className="p-8 pb-4 border-b border-zinc-50 dark:border-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                       <PieChart className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black italic uppercase tracking-tight dark:text-white leading-none mb-1">
                        {budget.category}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">
                           {format(parseISO(`${budget.startMonth || budget.month}-01`), 'MMM yy')}
                           {budget.endMonth ? ` → ${format(parseISO(`${budget.endMonth}-01`), 'MMM yy')}` : ' (Template)'}
                        </span>
                        {budget.isRecurring && (
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-zinc-100 dark:border-zinc-800"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors border border-zinc-100 dark:border-zinc-800"
                      onClick={() => {
                        if (budget.isRecurring) {
                          setDeleteChoiceId(budget.id);
                        } else {
                          setDeleteConfirmId(budget.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex items-end justify-between mb-6">
                  <div className="space-y-1">
                    <p className="text-3xl font-black italic tracking-tighter dark:text-white tabular-nums">
                      {formatAmount(budget.spent, budget.currency)}
                    </p>
                    <div className="flex items-center gap-2">
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 opacity-60 leading-none">Utilization against</p>
                       <p className="text-[10px] font-bold dark:text-zinc-300 tracking-widest tabular-nums">{formatAmount(budget.limit, budget.currency)}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex flex-col items-center justify-center border transition-colors",
                    budget.percentage > 100 
                      ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.1)]" 
                      : "bg-zinc-50 border-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
                  )}>
                    <span className="text-[10px] font-black leading-none">{Math.round(budget.percentage)}</span>
                    <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter">%</span>
                  </div>
                </div>
                
                <div className="relative pt-2 pb-4">
                  <Progress value={Math.min(100, budget.percentage)}>
                    <ProgressTrack className={cn("h-4 rounded-full p-1", budget.percentage > 100 ? "bg-rose-100 dark:bg-rose-900/30 shadow-inner" : "bg-zinc-100 dark:bg-zinc-900 shadow-inner")}>
                      <ProgressIndicator className={cn(
                        "h-full transition-all rounded-full shadow-lg relative", 
                        budget.percentage > 100 
                          ? "bg-gradient-to-r from-rose-500 to-rose-700" 
                          : "bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600"
                      )} />
                    </ProgressTrack>
                  </Progress>
                  
                  {budget.percentage > 100 ? (
                    <div className="mt-6 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-500/5">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 mb-0.5 opacity-60 leading-none">Threshold Violated</p>
                        <p className="text-[10px] text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wide">
                          Strategic Overrun: {formatAmount(budget.spent - budget.limit, budget.currency)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 flex justify-between px-2">
                       <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Reserve path active</span>
                       <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
                         {Math.max(0, 100 - Math.round(budget.percentage))}% headroom
                       </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 text-center">
            <div className="h-16 w-16 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-6">
              <PieChart className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-tight text-zinc-900 dark:text-white">No budgets set</h3>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mt-2 text-xs font-medium">
              Establish monthly spending limits to stay on track.
            </p>
          </div>
        )}
      </div>

      {/* Recurring Edit Choice Dialog */}
      <Dialog 
        open={recurringChoiceId !== null} 
        onOpenChange={(open) => !open && setRecurringChoiceId(null)}
      >
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white dark:bg-zinc-950">
          <DialogHeader className="p-8 pb-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-500/20">
              <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tight">Recurring Budget</DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">
              This budget is active across multiple months. How would you like to handle this edit?
            </DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-8 space-y-3">
            <Button 
              className="w-full h-16 justify-start px-6 rounded-2xl bg-zinc-900 border-zinc-800 dark:bg-white dark:text-black hover:scale-[1.01] active:scale-[0.98] transition-all group"
              onClick={() => {
                const budget = budgets.find(b => b.id === recurringChoiceId);
                if (budget) openEditDialog(budget);
              }}
            >
              <div className="h-10 w-10 rounded-xl bg-white/10 dark:bg-black/5 flex items-center justify-center mr-4 group-hover:bg-white/20 transition-colors">
                <Layers className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-start translate-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Permanent Change</span>
                <span className="text-xs font-bold italic uppercase tracking-tight opacity-70">Update Whole Series</span>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full h-16 justify-start px-6 rounded-2xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:scale-[1.01] active:scale-[0.98] transition-all group"
              onClick={() => {
                const budget = budgets.find(b => b.id === recurringChoiceId);
                if (budget) handleEditThisMonthOnly(budget);
              }}
            >
              <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mr-4 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                <CalendarCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex flex-col items-start translate-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Temporary Adjustment</span>
                <span className="text-xs font-bold italic uppercase tracking-tight opacity-70 text-zinc-500">Edit This Month Only</span>
              </div>
            </Button>
          </div>
          <DialogFooter className="bg-zinc-50 dark:bg-zinc-900 px-8 py-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-center sm:justify-center">
             <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white" onClick={() => setRecurringChoiceId(null)}>
               Dismiss
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring Deletion Choice Dialog */}
      <Dialog 
        open={deleteChoiceId !== null} 
        onOpenChange={(open) => !open && setDeleteChoiceId(null)}
      >
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white dark:bg-zinc-950">
          <DialogHeader className="p-8 pb-4 text-left">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-500/20">
              <Trash2 className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tight">Revoke Recurring Budget</DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">
              This is a recurring budget. How would you like to handle this deletion?
            </DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-8 space-y-3">
            <Button 
              variant="destructive"
              className="w-full h-16 justify-start px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white border-none hover:scale-[1.01] active:scale-[0.98] transition-all group"
              onClick={() => {
                if (deleteChoiceId) {
                  setDeleteConfirmId(deleteChoiceId);
                  setDeleteChoiceId(null);
                }
              }}
            >
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mr-4">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-start translate-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Total Purge</span>
                <span className="text-xs font-bold italic uppercase tracking-tight opacity-90">Delete Whole Series</span>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full h-16 justify-start px-6 rounded-2xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:scale-[1.01] active:scale-[0.98] transition-all group"
              onClick={() => {
                const budget = budgets.find(b => b.id === deleteChoiceId);
                if (budget) handleDeleteThisMonthOnly(budget);
              }}
            >
              <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mr-4 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                <CalendarCheck className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col items-start translate-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Strategic Exclusion</span>
                <span className="text-xs font-bold italic uppercase tracking-tight opacity-70 text-zinc-500">Remove This Month Only</span>
              </div>
            </Button>
          </div>
          <DialogFooter className="bg-zinc-50 dark:bg-zinc-900 px-8 py-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-center sm:justify-center">
             <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white" onClick={() => setDeleteChoiceId(null)}>
               Retain Records
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog 
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Budget"
        description="Are you sure you want to remove this budget limit? This action cannot be undone."
        onConfirm={handleDeleteBudget}
      />
    </div>
  );
}
