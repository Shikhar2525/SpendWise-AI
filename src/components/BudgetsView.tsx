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
import { Trash2, Edit, Plus, PieChart, AlertCircle, Target } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from './ui/confirm-dialog';
import { cn } from '../lib/utils';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';

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
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    category: 'Food' as Budget['category'],
    limit: '',
    currency: preferredCurrency.code,
    month: selectedMonth,
    isRecurring: false
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, month: selectedMonth }));
  }, [selectedMonth]);

  useEffect(() => {
    if (!editingBudget) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingBudget]);

  const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
  const monthEnd = endOfMonth(parseISO(`${selectedMonth}-01`));

  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => b.isRecurring || b.month === selectedMonth);
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
      month: selectedMonth,
      isRecurring: false
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit.toString(),
      currency: budget.currency || 'USD',
      month: budget.month,
      isRecurring: budget.isRecurring || false
    });
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
        month: formData.month,
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
      toast.success('Budget removed');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
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
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50/50 dark:bg-zinc-900/50">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5 items-end">
              <div className="grid gap-2">
                <Label className="dark:text-zinc-400">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger className="bg-white dark:bg-zinc-900 dark:border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="dark:text-zinc-400">Limit</Label>
                <Input 
                  type="number" 
                  className="bg-white dark:bg-zinc-900 dark:border-zinc-800"
                  value={formData.limit}
                  onChange={(e) => setFormData({...formData, limit: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label className="dark:text-zinc-400 text-xs">Currency</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData({...formData, currency: v})}
                >
                  <SelectTrigger className="bg-white dark:bg-zinc-900 dark:border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="dark:text-zinc-400">Month</Label>
                <Input 
                  type="month" 
                  className="bg-white dark:bg-zinc-900 dark:border-zinc-800"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                  disabled={formData.isRecurring}
                />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <input 
                  type="checkbox" 
                  id="b-isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <Label htmlFor="b-isRecurring" className="text-xs font-bold uppercase tracking-tight cursor-pointer">Every Month</Label>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold uppercase text-[10px] tracking-widest" onClick={handleSaveBudget}>Save</Button>
                <Button variant="outline" className="flex-1 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {budgetProgress.length > 0 ? (
          budgetProgress.map((budget) => (
            <Card key={budget.id} className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 overflow-hidden group transition-all hover:border-indigo-400 dark:hover:border-indigo-500">
              <CardHeader className="pb-2 border-b border-zinc-50 dark:border-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                       <PieChart className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                    </div>
                    <CardTitle className="text-sm font-black italic uppercase tracking-tight dark:text-white">{budget.category}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      onClick={() => setDeleteConfirmId(budget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-end justify-between mb-4">
                  <div className="space-y-1">
                    <p className="text-2xl font-black italic tracking-tighter dark:text-white">{formatAmount(budget.spent, budget.currency)}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Spent of {formatAmount(budget.limit, budget.currency)}</p>
                  </div>
                  <div className={`text-xs font-black uppercase tracking-tighter rounded-full px-2 py-0.5 ${budget.percentage > 100 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                    {Math.round(budget.percentage)}%
                  </div>
                </div>
                <Progress value={Math.min(100, budget.percentage)}>
                  <ProgressTrack className={cn("h-3", budget.percentage > 100 ? "bg-rose-100 dark:bg-rose-900/30" : "bg-zinc-100 dark:bg-zinc-900")}>
                    <ProgressIndicator className={cn("h-full transition-all rounded-full shadow-lg", budget.percentage > 100 ? "bg-rose-600 dark:bg-rose-500" : "bg-indigo-600 dark:bg-indigo-500")} />
                  </ProgressTrack>
                </Progress>
                {budget.percentage > 100 && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-3 w-3" />
                    </div>
                    <p className="text-[10px] text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wider">
                      Strategic alert: Threshold exceeded by {formatAmount(budget.spent - budget.limit, budget.currency)}
                    </p>
                  </div>
                )}
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
