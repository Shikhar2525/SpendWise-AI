import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress, ProgressIndicator, ProgressTrack } from './ui/progress';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Salary, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO, isSameMonth } from 'date-fns';
import { Trash2, Edit, Plus, Wallet, TrendingUp, Calendar, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConfirmDialog } from './ui/confirm-dialog';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { expandRecurringItems } from '../lib/utils/recurringUtils';
import { Logo } from './Logo';
import { cn, formatInputText } from '../lib/utils';

interface SalariesViewProps {
  data: {
    salaries: Salary[];
    loading: boolean;
  };
}

export default function SalariesView({ data }: SalariesViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { selectedMonth } = useFinancialPeriod();
  const { salaries } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [editMode, setEditMode] = useState<'all' | 'single'>('all');

  const monthDate = parseISO(`${selectedMonth}-01`);
  const [formData, setFormData] = useState({
    amount: '',
    currency: preferredCurrency.code,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: 'Monthly Salary',
    isRecurring: true,
    repeatUntil: ''
  });

  useEffect(() => {
    if (!editingSalary) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingSalary]);

  const openAddDialog = () => {
    setEditingSalary(null);
    setEditMode('all');
    setFormData({
      amount: '',
      currency: preferredCurrency.code,
      date: format(monthDate, 'yyyy-MM-dd'),
      description: 'Monthly Salary',
      isRecurring: true,
      repeatUntil: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (salary: Salary) => {
    setEditingSalary(salary);
    // If we are editing a recurring salary, we default to 'all' usually,
    // but we'll show the toggle in the UI.
    setEditMode('all');
    setFormData({
      amount: salary.amount.toString(),
      currency: salary.currency || 'USD',
      date: salary.date,
      description: salary.description,
      isRecurring: salary.isRecurring,
      repeatUntil: salary.repeatUntil || ''
    });
    setIsDialogOpen(true);
  };

  const handleSaveSalary = async () => {
    if (!user) return;
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingSalary) {
        if (editingSalary.isRecurring && editMode === 'single') {
          // 1. Exclude this date from the recurring series
          const updatedExcluded = [...(editingSalary.excludedDates || []), formData.date];
          await updateDoc(doc(db, 'salaries', editingSalary.id), {
            excludedDates: updatedExcluded,
            updatedAt: new Date().toISOString()
          });

          // 2. Add a new one-off item for this month
          const newSalaryData = {
            uid: user.uid,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            date: formData.date,
            description: formatInputText(formData.description),
            isRecurring: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'salaries'), newSalaryData);
          toast.success('Instance updated successfully (One-off override created)');
        } else {
          // Normal update
          const salaryData = {
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            date: formData.date,
            description: formatInputText(formData.description),
            isRecurring: formData.isRecurring,
            repeatUntil: formData.isRecurring ? formData.repeatUntil : null,
            updatedAt: new Date().toISOString()
          };
          await updateDoc(doc(db, 'salaries', editingSalary.id), salaryData);
          toast.success('Income updated successfully');
        }
      } else {
        const salaryData = {
          uid: user.uid,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          date: formData.date,
          description: formatInputText(formData.description),
          isRecurring: formData.isRecurring,
          repeatUntil: formData.isRecurring ? formData.repeatUntil : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'salaries'), salaryData);
        toast.success('Income added successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingSalary ? OperationType.UPDATE : OperationType.CREATE, 'salaries');
    }
  };

  const handleDeleteSalary = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'salaries', deleteConfirmId));
      toast.success('Income entry deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'salaries');
    }
  };

  const filteredSalaries = expandRecurringItems(salaries, monthDate)
    .sort((a, b) => {
      const dateA = parseISO(a.date).getTime();
      const dateB = parseISO(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-emerald-500/20">
            <ArrowUpCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight italic">Income</h2>
              <Logo className="h-5 w-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Manage your income sources and history</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              render={
                <Button onClick={openAddDialog} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 gap-2 h-10 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-none font-black uppercase text-[10px] tracking-widest">
                  <Plus className="h-4 w-4" /> Add Income
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px] dark:bg-zinc-950 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="font-black italic text-xl dark:text-white">{editingSalary ? 'Edit Income' : 'New Income'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="e.g. Salary, Dividend" 
                    className="dark:bg-zinc-900 dark:border-zinc-800"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Amount</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="0.00" 
                      className="font-bold dark:bg-zinc-900 dark:border-zinc-800"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Currency</Label>
                    <Select 
                      value={formData.currency} 
                      onValueChange={(v) => setFormData({...formData, currency: v})}
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
                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Entry Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    className="dark:bg-zinc-900 dark:border-zinc-800"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>

                {editingSalary?.isRecurring && (
                  <div className="grid gap-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Recurring Update Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={editMode === 'all' ? 'default' : 'outline'}
                        onClick={() => setEditMode('all')}
                        className={cn(
                          "h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                          editMode === 'all' 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        All Instances
                      </Button>
                      <Button
                        type="button"
                        variant={editMode === 'single' ? 'default' : 'outline'}
                        onClick={() => setEditMode('single')}
                        className={cn(
                          "h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                          editMode === 'single' 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        This Instance
                      </Button>
                    </div>
                    <p className="text-[10px] text-indigo-600/60 dark:text-indigo-400/60 font-medium leading-tight">
                      {editMode === 'all' 
                        ? "Changes will apply to all months in the series." 
                        : "Creates a one-off override for this specific month."}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-all">
                  <input 
                    type="checkbox" 
                    id="isRecurring" 
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-zinc-900"
                  />
                  <Label htmlFor="isRecurring" className="text-xs font-bold uppercase tracking-tighter cursor-pointer dark:text-zinc-300">Recurring Monthly Income</Label>
                </div>
                {formData.isRecurring && (
                  <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="repeatUntil" className="text-xs font-bold uppercase tracking-widest text-zinc-500">End Date (Optional)</Label>
                    <Input 
                      id="repeatUntil" 
                      type="date" 
                      className="dark:bg-zinc-900 dark:border-zinc-800"
                      value={formData.repeatUntil}
                      onChange={(e) => setFormData({...formData, repeatUntil: e.target.value})}
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest" onClick={handleSaveSalary}>
                  {editingSalary ? 'Save Changes' : 'Add Income'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-950 rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-b dark:border-zinc-800">
                <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Date</TableHead>
                <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Description</TableHead>
                <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Recurring</TableHead>
                <TableHead className="text-right font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaries.length > 0 ? (
                filteredSalaries.map((salary) => (
                  <TableRow key={salary.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors border-b dark:border-zinc-900/50 group">
                    <TableCell className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {format(parseISO(salary.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400 font-medium tracking-tight whitespace-nowrap">
                      {formatInputText(salary.description)}
                    </TableCell>
                    <TableCell>
                      {salary.isRecurring ? (
                        <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">
                          Recurring
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">
                          One-off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black italic tracking-tighter text-emerald-600 dark:text-emerald-400 text-lg">
                      +{formatAmount(salary.amount, salary.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          onClick={() => openEditDialog(salary)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-rose-600"
                          onClick={() => setDeleteConfirmId(salary.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500 dark:text-zinc-600 italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <ArrowUpCircle className="h-8 w-8 opacity-20" />
                       <p>No income streams identified for this period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog 
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Income"
        description="Are you sure you want to delete this income entry? This action cannot be undone."
        onConfirm={handleDeleteSalary}
      />
    </div>
  );
}
