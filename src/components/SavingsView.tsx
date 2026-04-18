import { useState, useEffect } from 'react';
import { Saving, Goal, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO, isSameMonth } from 'date-fns';
import { Logo } from './Logo';
import { Trash2, Edit, Plus, PiggyBank, TrendingUp, CalendarClock, Target, Calendar, Sparkles, Filter, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress, ProgressTrack, ProgressIndicator } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { expandRecurringItems } from '../lib/utils/recurringUtils';
import { cn, formatInputText } from '../lib/utils';

interface SavingsViewProps {
  data: {
    savings: Saving[];
    goals: Goal[];
    loading: boolean;
  };
  activeSubTab?: string;
}

const SAVING_TYPES = ['RD', 'FD', 'Mutual Fund', 'Stocks', 'Crypto', 'Gold', 'Provident Fund', 'Other'];

export default function SavingsView({ data, activeSubTab }: SavingsViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { selectedMonth } = useFinancialPeriod();
  const { savings, goals } = data;
  
  const [activeTab, setActiveTab] = useState(activeSubTab || 'entries');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);
  
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
        description: formatInputText(savingFormData.description),
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
        name: formatInputText(goalFormData.name),
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
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors duration-500">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight italic">Savings & Wealth</h2>
              <Logo className="h-5 w-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Build your future and track long-term growth</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
           <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Growth Phase</span>
             <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 italic">Active <TrendingUp className="h-3 w-3" /></span>
           </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
          <TabsList className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl h-auto border border-zinc-200 dark:border-zinc-800">
            <TabsTrigger value="entries" className="rounded-lg px-8 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none font-bold uppercase text-[10px] tracking-widest transition-all">
              History
            </TabsTrigger>
            <TabsTrigger value="goals" className="rounded-lg px-8 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none font-bold uppercase text-[10px] tracking-widest transition-all">
              Goals
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <TabsContent value="entries" className="mt-0">
              <Dialog open={isSavingDialogOpen} onOpenChange={setIsSavingDialogOpen}>
                <DialogTrigger 
                  render={
                    <Button onClick={openAddSavingDialog} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 gap-2 h-11 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-none font-black uppercase text-[10px] tracking-widest">
                      <Plus className="h-4 w-4" /> Add Savings Entry
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-[425px] dark:bg-zinc-950 dark:border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="font-black italic text-xl dark:text-white">{editingSaving ? 'Modify Entry' : 'New Capital Flow'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Name</Label>
                      <Input 
                        id="description" 
                        placeholder="e.g. Monthly Savings" 
                        className="dark:bg-zinc-900 dark:border-zinc-800"
                        value={savingFormData.description}
                        onChange={(e) => setSavingFormData({...savingFormData, description: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Savings Type</Label>
                      <Select 
                        value={savingFormData.type} 
                        onValueChange={(v) => setSavingFormData({...savingFormData, type: v as Saving['type']})}
                      >
                        <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                          {SAVING_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Amount</Label>
                        <Input 
                          id="amount" 
                          type="number" 
                          placeholder="0.00" 
                          className="font-bold dark:bg-zinc-900 dark:border-zinc-800"
                          value={savingFormData.amount}
                          onChange={(e) => setSavingFormData({...savingFormData, amount: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="currency" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Currency</Label>
                        <Select 
                          value={savingFormData.currency} 
                          onValueChange={(v) => setSavingFormData({...savingFormData, currency: v})}
                        >
                          <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800">
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                            {CURRENCIES.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="startDate" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Start Date</Label>
                        <Input 
                          id="startDate" 
                          type="date" 
                          className="dark:bg-zinc-900 dark:border-zinc-800"
                          value={savingFormData.startDate}
                          onChange={(e) => setSavingFormData({...savingFormData, startDate: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endDate" className="text-xs font-bold uppercase tracking-widest text-zinc-500">End Date (Optional)</Label>
                        <Input 
                          id="endDate" 
                          type="date" 
                          className="dark:bg-zinc-900 dark:border-zinc-800"
                          value={savingFormData.endDate}
                          onChange={(e) => setSavingFormData({...savingFormData, endDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-all">
                      <input 
                        type="checkbox" 
                        id="isRecurring" 
                        checked={savingFormData.isRecurring}
                        onChange={(e) => setSavingFormData({...savingFormData, isRecurring: e.target.checked})}
                        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-zinc-900"
                      />
                      <Label htmlFor="isRecurring" className="text-xs font-bold uppercase tracking-tighter cursor-pointer dark:text-zinc-300">Recurring Capital Injection</Label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsSavingDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest" onClick={handleSaveSaving}>
                      {editingSaving ? 'Update Ledger' : 'Authorize Flow'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="goals" className="mt-0">
              <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                <DialogTrigger 
                  render={
                    <Button onClick={openAddGoalDialog} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 gap-2 h-11 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-none font-black uppercase text-[10px] tracking-widest">
                      <Plus className="h-4 w-4" /> Start New Goal
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-[425px] dark:bg-zinc-950 dark:border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="font-black italic text-xl dark:text-white uppercase tracking-tight">{editingGoal ? 'Edit Goal' : 'New Goal'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Goal Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. New Car, Emergency Fund" 
                        className="dark:bg-zinc-900 dark:border-zinc-800"
                        value={goalFormData.name}
                        onChange={(e) => setGoalFormData({...goalFormData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="target" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Goal Amount</Label>
                        <Input 
                          id="target" 
                          type="number" 
                          placeholder="0.00" 
                          className="font-black dark:bg-zinc-900 dark:border-zinc-800"
                          value={goalFormData.targetAmount}
                          onChange={(e) => setGoalFormData({...goalFormData, targetAmount: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="currency" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Currency</Label>
                        <Select 
                          value={goalFormData.currency} 
                          onValueChange={(v) => setGoalFormData({...goalFormData, currency: v})}
                        >
                          <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800">
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                            {CURRENCIES.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="current" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Starting Balance</Label>
                      <Input 
                        id="current" 
                        type="number" 
                        placeholder="0.00" 
                        className="dark:bg-zinc-900 dark:border-zinc-800"
                        value={goalFormData.currentAmount}
                        onChange={(e) => setGoalFormData({...goalFormData, currentAmount: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="deadline" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Target Date</Label>
                      <Input 
                        id="deadline" 
                        type="date" 
                        className="dark:bg-zinc-900 dark:border-zinc-800"
                        value={goalFormData.deadline}
                        onChange={(e) => setGoalFormData({...goalFormData, deadline: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsGoalDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest" onClick={handleSaveGoal}>
                      {editingGoal ? 'Update Goal' : 'Create Goal'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="entries" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-950 rounded-3xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-b dark:border-zinc-800">
                    <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest pl-6">Start Date</TableHead>
                    <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Description</TableHead>
                    <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Type</TableHead>
                    <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Pipeline</TableHead>
                    <TableHead className="text-right font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="w-[100px] pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSavings.length > 0 ? (
                    filteredSavings.map((saving) => (
                      <TableRow key={saving.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors border-b dark:border-zinc-900/50 group">
                        <TableCell className="font-bold text-zinc-900 dark:text-zinc-100 pl-6">
                          {format(parseISO(saving.startDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400 font-medium tracking-tight whitespace-nowrap">
                          {formatInputText(saving.description)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold italic uppercase text-[9px] tracking-tight bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 px-2 py-0.5">
                            {saving.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {saving.isRecurring ? (
                            <Badge className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-none font-bold uppercase text-[9px] tracking-widest px-2 py-0.5 shadow-none">
                              Recurring
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5 shadow-none">
                              One-off
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-black italic tracking-tighter text-indigo-600 dark:text-indigo-400 text-lg">
                          {formatAmount(saving.amount, saving.currency)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex justify-end gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              onClick={() => openEditSavingDialog(saving)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-zinc-400 hover:text-rose-600"
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
                      <TableCell colSpan={6} className="h-40 text-center text-zinc-500 dark:text-zinc-600 italic">
                        <div className="flex flex-col items-center justify-center gap-3">
                           <PiggyBank className="h-10 w-10 opacity-10" />
                           <p className="text-sm font-medium">No active capital flows identified.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-8 md:grid-cols-2">
            {goals.length > 0 ? (
              goals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const isOverSaved = goal.currentAmount > goal.targetAmount;
                const isComplete = progress >= 100;

                return (
                  <Card key={goal.id} className="border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-none bg-white dark:bg-zinc-950 rounded-[3rem] overflow-hidden group transition-all duration-500 hover:shadow-2xl dark:hover:border-indigo-500/30">
                    <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 p-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "rounded-2xl p-3 shadow-xl transition-transform group-hover:scale-110 duration-500",
                            isComplete ? "bg-emerald-500 text-white" : "bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 border border-zinc-100 dark:border-zinc-800"
                          )}>
                            {isComplete ? <CheckCircle2 className="h-6 w-6" /> : <Target className="h-6 w-6" />}
                          </div>
                          <div>
                            <CardTitle className="text-xl font-black italic tracking-tight uppercase leading-none dark:text-white uppercase whitespace-nowrap">
                              {formatInputText(goal.name)}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1.5 mt-1.5 font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest">
                              <Calendar className="h-3 w-3" />
                              By {format(parseISO(goal.deadline), 'MMMM yyyy')}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            onClick={() => openEditGoalDialog(goal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-zinc-400 hover:text-rose-600"
                            onClick={() => setDeleteConfirmInfo({ id: goal.id, type: 'goal' })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="space-y-8">
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <p className="text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white">{formatAmount(goal.currentAmount, goal.currency)}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Saved · Goal {formatAmount(goal.targetAmount, goal.currency)}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-2xl font-black italic tracking-tighter",
                              isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'
                            )}>{Math.round(progress)}%</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                              {isComplete 
                                ? 'Status: Complete' 
                                : `Remaining: ${formatAmount(goal.targetAmount - goal.currentAmount, goal.currency)}`}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Progress value={Math.min(100, progress)} className="h-4 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                             <ProgressTrack className="h-full w-full bg-transparent transition-all">
                               <ProgressIndicator className={cn(
                                 "h-full transition-all duration-1000 ease-out",
                                 isComplete ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                               )} />
                             </ProgressTrack>
                          </Progress>

                          {isOverSaved && (
                            <div className="p-4 rounded-[2rem] bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-3 animate-in fade-in duration-1000">
                              <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold leading-tight">
                                Hyper-growth: Surplus identified. {formatAmount(goal.currentAmount - goal.targetAmount, goal.currency)} exceeded baseline.
                              </p>
                            </div>
                          )}
                        </div>

                        {!isComplete && (
                          <div className="grid grid-cols-3 gap-2 pt-2">
                             {[100, 500, 1000].map(val => (
                               <Button 
                                 key={val}
                                 variant="outline" 
                                 size="sm" 
                                 className="h-10 font-bold dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-all rounded-xl border-zinc-100"
                                 onClick={() => handleUpdateGoalProgress(goal, val)}
                               >
                                 + {formatAmount(val, goal.currency)}
                               </Button>
                             ))}
                          </div>
                        )}

                        {!isComplete && (
                          <div className="flex gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <Input 
                              type="number" 
                              placeholder="Inject capital..." 
                              className="h-10 text-xs font-bold bg-transparent border-none shadow-none focus-visible:ring-0 px-4"
                              value={customAmounts[goal.id] || ''}
                              onChange={(e) => handleCustomAmountChange(goal.id, e.target.value)}
                            />
                            <Button 
                              size="sm" 
                              className="h-10 px-6 bg-zinc-950 dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-transform"
                              onClick={() => handleAddCustomAmount(goal)}
                            >
                              Add
                            </Button>
                          </div>
                        )}
                        
                        {isComplete && (
                           <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-500/20 rounded-[2.5rem] bg-emerald-500/5 text-center space-y-2">
                              <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-2">
                                 <ArrowUpRight className="h-6 w-6" />
                              </div>                               <h4 className="text-sm font-black italic uppercase tracking-tight text-emerald-600 dark:text-emerald-400">Goal Reached</h4>
                              <p className="text-[10px] text-emerald-700/60 font-medium px-8 italic">Congratulations! You've reached your savings goal.</p>
                           </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-950 rounded-[3rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800 text-center">
                <div className="h-20 w-20 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-200 dark:text-zinc-800 mb-8">
                  <Target className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-zinc-900 dark:text-white">No active goals</h3>
                <p className="text-zinc-500 dark:text-zinc-500 max-w-xs mx-auto mt-2 text-sm font-medium leading-relaxed">
                  Start a new goal to track your savings progress.
                </p>
                <Button variant="outline" className="mt-10 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest px-10 h-12 rounded-2xl" onClick={openAddGoalDialog}>
                  Start New Goal
                </Button>
              </div>

            )}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog 
        open={deleteConfirmInfo !== null}
        onOpenChange={(open) => !open && setDeleteConfirmInfo(null)}
        title={`Terminate ${deleteConfirmInfo?.type === 'saving' ? 'Capital Stream' : 'Mission'}`}
        description={`Are you certain you wish to terminate this ${deleteConfirmInfo?.type === 'saving' ? 'savings entry' : 'mission'}? This action is irreversible.`}
        onConfirm={deleteConfirmInfo?.type === 'saving' ? handleDeleteSaving : handleDeleteGoal}
      />
    </div>
  );
}
