import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Budget, Expense, CATEGORIES, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Trash2, Edit, Plus, PieChart, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  const { budgets, expenses } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    category: 'Food',
    limit: '',
    currency: preferredCurrency.code,
    month: format(new Date(), 'yyyy-MM')
  });

  useEffect(() => {
    if (!editingBudget) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingBudget]);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const budgetProgress = useMemo(() => {
    return budgets.map(budget => {
      const spent = expenses
        .filter(e => e.category === budget.category && isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }))
        .reduce((sum, e) => {
          // Convert expense amount to budget currency for accurate comparison
          const convertedAmount = convert(e.amount, e.currency || 'USD', budget.currency || 'USD');
          return sum + convertedAmount;
        }, 0);
      
      const percentage = (spent / budget.limit) * 100;
      return { ...budget, spent, percentage };
    });
  }, [budgets, expenses, monthStart, monthEnd, convert]);

  const openAddDialog = () => {
    setEditingBudget(null);
    setFormData({
      category: 'Food',
      limit: '',
      currency: preferredCurrency.code,
      month: format(new Date(), 'yyyy-MM')
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit.toString(),
      currency: budget.currency || 'USD',
      month: budget.month
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

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this budget?')) return;
    try {
      await deleteDoc(doc(db, 'budgets', id));
      toast.success('Budget removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openAddDialog} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2">
          <Plus className="h-4 w-4" />
          Set Budget Limit
        </Button>
      </div>

      {isDialogOpen && (
        <Card className="border-zinc-200 shadow-sm bg-zinc-50/50">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5 items-end">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger className="bg-white">
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
                <Label>Limit</Label>
                <Input 
                  type="number" 
                  className="bg-white"
                  value={formData.limit}
                  onChange={(e) => setFormData({...formData, limit: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData({...formData, currency: v})}
                >
                  <SelectTrigger className="bg-white">
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
                <Label>Month</Label>
                <Input 
                  type="month" 
                  className="bg-white"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-zinc-900 text-white" onClick={handleSaveBudget}>Save</Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {budgetProgress.length > 0 ? (
          budgetProgress.map((budget) => (
            <Card key={budget.id} className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-zinc-400" />
                    <CardTitle className="text-sm font-semibold">{budget.category}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-zinc-400 hover:text-red-600"
                      onClick={() => handleDeleteBudget(budget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-2">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{formatAmount(budget.spent, budget.currency)}</p>
                    <p className="text-xs text-zinc-500">Spent of {formatAmount(budget.limit, budget.currency)}</p>
                  </div>
                  <div className={`text-sm font-bold ${budget.percentage > 90 ? 'text-red-600' : 'text-zinc-900'}`}>
                    {Math.round(budget.percentage)}%
                  </div>
                </div>
                <Progress 
                  value={Math.min(100, budget.percentage)} 
                  className={`h-2 ${budget.percentage > 100 ? 'bg-red-100' : ''}`}
                />
                {budget.percentage > 100 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-red-600 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Budget exceeded by {formatAmount(budget.spent - budget.limit, budget.currency)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-zinc-200 text-center">
            <PieChart className="h-12 w-12 text-zinc-200 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900">No budget limits set</h3>
            <p className="text-zinc-500 max-w-xs mx-auto mt-1">
              Set monthly limits for categories like Food, Transport, etc. to stay on track.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
