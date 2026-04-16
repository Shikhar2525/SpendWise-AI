import { useState, useEffect } from 'react';
import { Saving, Goal, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO, isSameMonth } from 'date-fns';
import { Trash2, Edit, Plus, PiggyBank, TrendingUp, CalendarClock, Target, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { expandRecurringItems } from '../lib/utils/recurringUtils';

interface SavingsViewProps {
  data: {
    savings: Saving[];
    goals: Goal[];
    loading: boolean;
  };
}

const SAVING_TYPES = ['RD', 'FD', 'Mutual Fund', 'Stocks', 'Crypto', 'Gold', 'Provident Fund', 'Other'];

export default function SavingsView({ data }: SavingsViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { selectedMonth } = useFinancialPeriod();
  const { savings, goals } = data;
  
  // Confirmation state
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{ id: string, type: 'saving' | 'goal' } | null>(null);

  // Savings State
  const [isSavingDialogOpen, setIsSavingDialogOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [savingFormData, setSavingFormData] = useState({
    amount: '',
    currency: preferredCurrency.code,
    type: 'RD' as Saving['type'],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    description: '',
    isRecurring: true
  });

  // Goals State
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalFormData, setGoalFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    currency: preferredCurrency.code,
    deadline: format(new Date(), 'yyyy-MM-dd')
  });

  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const monthDate = parseISO(`${selectedMonth}-01`);

  useEffect(() => {
    if (!editingSaving) {
      setSavingFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
    if (!editingGoal) {
      setGoalFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingSaving, editingGoal]);

  // Savings Handlers
  const openAddSavingDialog = () => {
    setEditingSaving(null);
    setSavingFormData({
      amount: '',
      currency: preferredCurrency.code,
      type: 'RD',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      description: '',
      isRecurring: true
    });
    setIsSavingDialogOpen(true);
  };

  const openEditSavingDialog = (saving: Saving) => {
    setEditingSaving(saving);
    setSavingFormData({
      amount: saving.amount.toString(),
      currency: saving.currency || 'USD',
      type: saving.type,
      startDate: saving.startDate,
      endDate: saving.endDate || '',
      description: saving.description,
      isRecurring: saving.isRecurring
    });
    setIsSavingDialogOpen(true);
  };

  const handleSaveSaving = async () => {
    if (!user) return;
    if (!savingFormData.amount || !savingFormData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const savingData = {
        uid: user.uid,
        amount: parseFloat(savingFormData.amount),
        currency: savingFormData.currency,
        type: savingFormData.type,
        startDate: savingFormData.startDate,
        endDate: savingFormData.endDate || null,
        description: savingFormData.description,
        isRecurring: savingFormData.isRecurring,
        updatedAt: new Date().toISOString()
      };

      if (editingSaving) {
        await updateDoc(doc(db, 'savings', editingSaving.id), savingData);
        toast.success('Savings entry updated');
      } else {
        await addDoc(collection(db, 'savings'), {
          ...savingData,
          createdAt: new Date().toISOString()
        });
        toast.success('Savings entry added');
      }
      setIsSavingDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingSaving ? OperationType.UPDATE : OperationType.CREATE, 'savings');
    }
  };

  const handleDeleteSaving = async () => {
    if (!deleteConfirmInfo || deleteConfirmInfo.type !== 'saving') return;
    try {
      await deleteDoc(doc(db, 'savings', deleteConfirmInfo.id));
      toast.success('Savings entry deleted');
      setDeleteConfirmInfo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'savings');
    }
  };

  // Goals Handlers
  const openAddGoalDialog = () => {
    setEditingGoal(null);
    setGoalFormData({
      name: '',
      targetAmount: '',
      currentAmount: '0',
      currency: preferredCurrency.code,
      deadline: format(new Date(), 'yyyy-MM-dd')
    });
    setIsGoalDialogOpen(true);
  };

  const openEditGoalDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      currency: goal.currency || 'USD',
      deadline: goal.deadline
    });
    setIsGoalDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    if (!goalFormData.name || !goalFormData.targetAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const goalData = {
        uid: user.uid,
        name: goalFormData.name,
        targetAmount: parseFloat(goalFormData.targetAmount),
        currentAmount: parseFloat(goalFormData.currentAmount),
        currency: goalFormData.currency,
        deadline: goalFormData.deadline,
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
      setIsGoalDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingGoal ? OperationType.UPDATE : OperationType.CREATE, 'goals');
    }
  };

  const handleUpdateGoalProgress = async (goal: Goal, amount: number) => {
    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        currentAmount: goal.currentAmount + amount
      });
      toast.success('Progress updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'goals');
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteConfirmInfo || deleteConfirmInfo.type !== 'goal') return;
    try {
      await deleteDoc(doc(db, 'goals', deleteConfirmInfo.id));
      toast.success('Goal deleted');
      setDeleteConfirmInfo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'goals');
    }
  };

  const handleCustomAmountChange = (goalId: string, value: string) => {
    setCustomAmounts(prev => ({ ...prev, [goalId]: value }));
  };

  const handleAddCustomAmount = (goal: Goal) => {
    const amount = parseFloat(customAmounts[goal.id] || '0');
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    handleUpdateGoalProgress(goal, amount);
    setCustomAmounts(prev => ({ ...prev, [goal.id]: '' }));
  };

  const filteredSavings = expandRecurringItems(savings, monthDate)
    .sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());

  return (
    <div className="space-y-6">
      <Tabs defaultValue="entries" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-zinc-100 p-1 rounded-xl">
            <TabsTrigger value="entries" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Savings Entries
            </TabsTrigger>
            <TabsTrigger value="goals" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Savings Goals
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <TabsContent value="entries" className="mt-0">
              <Dialog open={isSavingDialogOpen} onOpenChange={setIsSavingDialogOpen}>
                <DialogTrigger render={<Button onClick={openAddSavingDialog} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 rounded-xl"><Plus className="h-4 w-4" />Add Savings</Button>} />
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingSaving ? 'Edit Savings' : 'Add New Savings'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input 
                        id="description" 
                        placeholder="e.g. Monthly RD Contribution" 
                        value={savingFormData.description}
                        onChange={(e) => setSavingFormData({...savingFormData, description: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Savings Type</Label>
                      <Select 
                        value={savingFormData.type} 
                        onValueChange={(v) => setSavingFormData({...savingFormData, type: v as Saving['type']})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SAVING_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input 
                          id="amount" 
                          type="number" 
                          placeholder="0.00" 
                          value={savingFormData.amount}
                          onChange={(e) => setSavingFormData({...savingFormData, amount: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select 
                          value={savingFormData.currency} 
                          onValueChange={(v) => setSavingFormData({...savingFormData, currency: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input 
                          id="startDate" 
                          type="date" 
                          value={savingFormData.startDate}
                          onChange={(e) => setSavingFormData({...savingFormData, startDate: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endDate">End Date (Optional)</Label>
                        <Input 
                          id="endDate" 
                          type="date" 
                          value={savingFormData.endDate}
                          onChange={(e) => setSavingFormData({...savingFormData, endDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isRecurring" 
                        checked={savingFormData.isRecurring}
                        onChange={(e) => setSavingFormData({...savingFormData, isRecurring: e.target.checked})}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                      <Label htmlFor="isRecurring">Recurring Monthly</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSavingDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-zinc-900 text-white" onClick={handleSaveSaving}>
                      {editingSaving ? 'Update Savings' : 'Save Savings'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="goals" className="mt-0">
              <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                <DialogTrigger render={<Button onClick={openAddGoalDialog} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 rounded-xl"><Plus className="h-4 w-4" />New Goal</Button>} />
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Goal Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. New Car, Emergency Fund" 
                        value={goalFormData.name}
                        onChange={(e) => setGoalFormData({...goalFormData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="target">Target Amount</Label>
                        <Input 
                          id="target" 
                          type="number" 
                          placeholder="0.00" 
                          value={goalFormData.targetAmount}
                          onChange={(e) => setGoalFormData({...goalFormData, targetAmount: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select 
                          value={goalFormData.currency} 
                          onValueChange={(v) => setGoalFormData({...goalFormData, currency: v})}
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
                        value={goalFormData.currentAmount}
                        onChange={(e) => setGoalFormData({...goalFormData, currentAmount: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input 
                        id="deadline" 
                        type="date" 
                        value={goalFormData.deadline}
                        onChange={(e) => setGoalFormData({...goalFormData, deadline: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-zinc-900 text-white" onClick={handleSaveGoal}>
                      {editingGoal ? 'Update Goal' : 'Create Goal'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="entries" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-zinc-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <TableHead>Start Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSavings.length > 0 ? (
                    filteredSavings.map((saving) => (
                      <TableRow key={saving.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="font-medium">
                          {format(parseISO(saving.startDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{saving.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {saving.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {saving.isRecurring ? (
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                              No
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-indigo-600">
                          {formatAmount(saving.amount, saving.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                              onClick={() => openEditSavingDialog(saving)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-zinc-400 hover:text-red-600"
                              onClick={() => setDeleteConfirmInfo({ id: saving.id, type: 'saving' })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                        No savings entries found. Start building your nest egg!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            {goals.length > 0 ? (
              goals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const isOverSaved = goal.currentAmount > goal.targetAmount;
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
                            onClick={() => openEditGoalDialog(goal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-400 hover:text-red-600"
                            onClick={() => setDeleteConfirmInfo({ id: goal.id, type: 'goal' })}
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
                  {isOverSaved && (
                    <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      <p className="text-[10px] text-emerald-700 font-bold">
                        Excellent! You have over-saved for {goal.name} with {formatAmount(goal.currentAmount - goal.targetAmount, goal.currency)} extra.
                      </p>
                    </div>
                  )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 min-w-[80px]"
                            onClick={() => handleUpdateGoalProgress(goal, 100)}
                          >
                            + {formatAmount(100, goal.currency)}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 min-w-[80px]"
                            onClick={() => handleUpdateGoalProgress(goal, 500)}
                          >
                            + {formatAmount(500, goal.currency)}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 min-w-[80px]"
                            onClick={() => handleUpdateGoalProgress(goal, 1000)}
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
        </TabsContent>
      </Tabs>

      <ConfirmDialog 
        open={deleteConfirmInfo !== null}
        onOpenChange={(open) => !open && setDeleteConfirmInfo(null)}
        title={`Delete ${deleteConfirmInfo?.type === 'saving' ? 'Savings Entry' : 'Goal'}`}
        description={`Are you sure you want to delete this ${deleteConfirmInfo?.type === 'saving' ? 'savings entry' : 'savings goal'}? This action cannot be undone.`}
        onConfirm={deleteConfirmInfo?.type === 'saving' ? handleDeleteSaving : handleDeleteGoal}
      />
    </div>
  );
}
