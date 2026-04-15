import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Goal, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO } from 'date-fns';
import { Trash2, Edit, Plus, Target, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface GoalsViewProps {
  data: {
    goals: Goal[];
    loading: boolean;
  };
}

export default function GoalsView({ data }: GoalsViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { goals } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    currency: preferredCurrency.code,
    deadline: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!editingGoal) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingGoal]);

  const openAddDialog = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '0',
      currency: preferredCurrency.code,
      deadline: format(new Date(), 'yyyy-MM-dd')
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      currency: goal.currency || 'USD',
      deadline: goal.deadline
    });
    setIsDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    if (!formData.name || !formData.targetAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const goalData = {
        uid: user.uid,
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount),
        currency: formData.currency,
        deadline: formData.deadline,
        updatedAt: new Date().toISOString()
      };

      if (editingGoal) {
        await updateDoc(doc(db, 'goals', editingGoal.id), goalData);
        toast.success('Savings goal updated');
      } else {
        await addDoc(collection(db, 'goals'), {
          ...goalData,
          createdAt: new Date().toISOString()
        });
        toast.success('Savings goal created');
      }
      setIsDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingGoal ? OperationType.UPDATE : OperationType.CREATE, 'goals');
    }
  };

  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const handleCustomAmountChange = (goalId: string, value: string) => {
    setCustomAmounts(prev => ({ ...prev, [goalId]: value }));
  };

  const handleAddCustomAmount = (goal) => {
    const amount = parseFloat(customAmounts[goal.id] || '0');
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    handleUpdateProgress(goal, amount);
    setCustomAmounts(prev => ({ ...prev, [goal.id]: '' }));
  };

  const handleUpdateProgress = async (goal: Goal, amount: number) => {
    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        currentAmount: goal.currentAmount + amount
      });
      toast.success('Progress updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'goals');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteDoc(doc(db, 'goals', id));
      toast.success('Goal deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'goals');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button onClick={openAddDialog} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"><Plus className="h-4 w-4" />New Goal</Button>} />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}</DialogTitle>
              <CardDescription>Set a target and track your progress over time.</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Goal Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. New Car, Emergency Fund" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="target">Target Amount</Label>
                  <Input 
                    id="target" 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData({...formData, currency: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current">Initial Savings</Label>
                <Input 
                  id="current" 
                  type="number" 
                  placeholder="0.00" 
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({...formData, currentAmount: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input 
                  id="deadline" 
                  type="date" 
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button className="bg-zinc-900 text-white" onClick={handleSaveGoal}>
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <Card key={goal.id} className="border-zinc-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-white p-2 shadow-sm">
                        <Target className="h-5 w-5 text-zinc-900" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          By {format(parseISO(goal.deadline), 'MMMM yyyy')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-zinc-900"
                        onClick={() => openEditDialog(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-red-600"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-3xl font-bold">{formatAmount(goal.currentAmount, goal.currency)}</p>
                        <p className="text-sm text-zinc-500">Saved of {formatAmount(goal.targetAmount, goal.currency)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${progress >= 100 ? 'text-emerald-600' : 'text-zinc-900'}`}>{Math.round(progress)}%</p>
                        <p className="text-xs text-zinc-500">
                          {goal.currentAmount >= goal.targetAmount 
                            ? 'Goal reached!' 
                            : `${formatAmount(goal.targetAmount - goal.currentAmount, goal.currency)} left`}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      {goal.currentAmount > goal.targetAmount && (
                        <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 animate-pulse">
                          <TrendingUp className="h-3 w-3" />
                          You have over-saved for this goal!
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 min-w-[80px]"
                        onClick={() => handleUpdateProgress(goal, 100)}
                      >
                        + {formatAmount(100, goal.currency)}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 min-w-[80px]"
                        onClick={() => handleUpdateProgress(goal, 500)}
                      >
                        + {formatAmount(500, goal.currency)}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 min-w-[80px]"
                        onClick={() => handleUpdateProgress(goal, 1000)}
                      >
                        + {formatAmount(1000, goal.currency)}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Custom amount" 
                        className="h-8 text-xs"
                        value={customAmounts[goal.id] || ''}
                        onChange={(e) => handleCustomAmountChange(goal.id, e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        className="h-8 bg-zinc-900 text-white"
                        onClick={() => handleAddCustomAmount(goal)}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-zinc-200 text-center">
            <Target className="h-12 w-12 text-zinc-200 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900">No savings goals yet</h3>
            <p className="text-zinc-500 max-w-xs mx-auto mt-1">
              Dreaming of a vacation or a new home? Set a goal and start saving today.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
