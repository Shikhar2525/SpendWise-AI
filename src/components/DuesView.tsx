import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Due, CATEGORIES, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO, isSameMonth } from 'date-fns';
import { Logo } from './Logo';
import { Trash2, Edit, Plus, CheckCircle2, Circle, CalendarClock, Sparkles, Calendar, Receipt, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { suggestCategory } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { useCallback } from 'react';
import debounce from 'lodash/debounce';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { expandRecurringItems } from '../lib/utils/recurringUtils';
import { cn } from '../lib/utils';

interface DuesViewProps {
  data: {
    dues: Due[];
    loading: boolean;
  };
}

export default function DuesView({ data }: DuesViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { selectedMonth } = useFinancialPeriod();
  const { dues } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingDue, setEditingDue] = useState<Due | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const monthDate = parseISO(`${selectedMonth}-01`);
  const [formData, setFormData] = useState({
    amount: '',
    currency: preferredCurrency.code,
    category: 'Utilities',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    isRecurring: false,
    repeatUntil: ''
  });

  useEffect(() => {
    if (!editingDue) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingDue]);

  const debouncedSuggest = useCallback(
    debounce(async (desc: string) => {
      if (desc.length < 3 || editingDue) return;
      setIsAutoAssigning(true);
      try {
        const category = await suggestCategory(desc);
        if (CATEGORIES.includes(category as any)) {
          setFormData(prev => ({ ...prev, category }));
        }
      } catch (error) {
        console.error('Auto-suggest error:', error);
      } finally {
        setIsAutoAssigning(false);
      }
    }, 1000),
    [editingDue]
  );

  useEffect(() => {
    if (formData.description && !editingDue) {
      debouncedSuggest(formData.description);
    }
  }, [formData.description, debouncedSuggest, editingDue]);

  const handleSuggestCategory = async () => {
    if (!formData.description) {
      toast.error('Please enter a description first');
      return;
    }
    setIsSuggesting(true);
    try {
      const category = await suggestCategory(formData.description);
      setFormData(prev => ({ ...prev, category }));
      toast.success(`AI suggested: ${category}`);
    } catch (error) {
      toast.error('Failed to suggest category');
    } finally {
      setIsSuggesting(false);
    }
  };

  const openAddDialog = () => {
    setEditingDue(null);
    setFormData({
      amount: '',
      currency: preferredCurrency.code,
      category: 'Utilities',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      isRecurring: false,
      repeatUntil: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (due: Due) => {
    setEditingDue(due);
    setFormData({
      amount: due.amount.toString(),
      currency: due.currency || 'USD',
      category: due.category,
      dueDate: due.dueDate,
      description: due.description,
      isRecurring: due.isRecurring,
      repeatUntil: due.repeatUntil || ''
    });
    setIsDialogOpen(true);
  };

  const handleSaveDue = async () => {
    if (!user) return;
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const dueData = {
        uid: user.uid,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category,
        dueDate: formData.dueDate,
        description: formData.description,
        isRecurring: formData.isRecurring,
        repeatUntil: formData.isRecurring ? formData.repeatUntil : null,
        updatedAt: new Date().toISOString()
      };

      if (editingDue) {
        await updateDoc(doc(db, 'dues', editingDue.id), dueData);
        toast.success('Due updated successfully');
      } else {
        await addDoc(collection(db, 'dues'), {
          ...dueData,
          isPaid: false,
          createdAt: new Date().toISOString()
        });
        toast.success('Due added successfully');
      }
      setIsDialogOpen(true);
      setIsDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingDue ? OperationType.UPDATE : OperationType.CREATE, 'dues');
    }
  };

  const handleTogglePaid = async (due: Due) => {
    try {
      const isMarkingPaid = !due.isPaid;
      
      if (isMarkingPaid) {
        // Automatically create an expense
        const expenseDoc = await addDoc(collection(db, 'expenses'), {
          uid: user?.uid,
          amount: due.amount,
          currency: due.currency || preferredCurrency.code,
          category: due.category,
          date: due.dueDate, // Use the due's date for the expense record
          description: `Settled: ${due.description}`,
          createdAt: new Date().toISOString()
        });

        if (due.isRecurring) {
          // If it's a recurring due, we create a one-off PAID record for this specific month
          // and keep the original recurring entry as-is (unpaid) for other months.
          await addDoc(collection(db, 'dues'), {
            uid: user?.uid,
            amount: due.amount,
            currency: due.currency || preferredCurrency.code,
            category: due.category,
            dueDate: due.dueDate,
            description: due.description,
            isPaid: true,
            isRecurring: false,
            settledExpenseId: expenseDoc.id,
            createdAt: new Date().toISOString()
          });
          toast.success('Recurring instance settled for this month');
        } else {
          await updateDoc(doc(db, 'dues', due.id), {
            isPaid: true,
            settledExpenseId: expenseDoc.id
          });
          toast.success('Due settled and expense recorded');
        }
      } else {
        // Unsettling: remove the expense if it exists
        if (due.settledExpenseId) {
          try {
            await deleteDoc(doc(db, 'expenses', due.settledExpenseId));
          } catch (err) {
            console.error('Failed to delete settled expense:', err);
          }
        }

        // If it was a one-off paid record for a recurring item, delete the record entirely
        // The recurring item will reappear as unpaid.
        // We identify a "shadow" record by it being non-recurring and having been created from a recurring context 
        // (usually description matches and it's paid, but since we're unsettling, we just check if it's the one we clicked)
        if (!due.isRecurring && due.isPaid) {
          // Check if this was a shadow record by looking for a recurring buddy
          const hasRecurringOriginal = dues.some(d => d.isRecurring && d.description === due.description);
          if (hasRecurringOriginal) {
            await deleteDoc(doc(db, 'dues', due.id));
            toast.success('Settlement record removed');
            return;
          }
        }

        await updateDoc(doc(db, 'dues', due.id), {
          isPaid: false,
          settledExpenseId: null
        });
        toast.success('Marked as unpaid');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'dues');
    }
  };

  const handleDeleteDue = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'dues', deleteConfirmId));
      toast.success('Due deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'dues');
    }
  };

  const sortedDues = expandRecurringItems(dues, monthDate)
    .filter(d => {
      // If it's a virtual instance of a recurring item, check if we've already created a 
      // one-off settled record for it in this month.
      if (d.isRecurring) {
        const isAlreadySettled = dues.some(realDue => 
          !realDue.isRecurring && 
          realDue.isPaid && 
          isSameMonth(parseISO(realDue.dueDate), monthDate) &&
          realDue.description === d.description
        );
        return !isAlreadySettled;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100/50 dark:border-amber-500/20">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight italic">Bills</h2>
              <Logo className="h-5 w-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Track and pay your regular bills</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              render={
                <Button onClick={openAddDialog} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 gap-2 h-10 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-none font-black uppercase text-[10px] tracking-widest">
                  <Plus className="h-4 w-4" /> Add Bill
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px] dark:bg-zinc-950 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="font-black italic text-xl dark:text-white">{editingDue ? 'Edit Bill' : 'New Bill'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Bill Name</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="description" 
                      placeholder="e.g. Rent, Electricity" 
                      className="flex-1 dark:bg-zinc-900 dark:border-zinc-800"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="shrink-0 text-zinc-900 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      onClick={handleSuggestCategory}
                      disabled={isSuggesting}
                      title="Auto-category"
                    >
                      <Sparkles className={`h-4 w-4 ${isSuggesting ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Category</Label>
                  <div className="relative">
                    <Select 
                      value={formData.category} 
                      onValueChange={(v) => setFormData({...formData, category: v})}
                    >
                      <SelectTrigger className={cn("dark:bg-zinc-900 dark:border-zinc-800", isAutoAssigning ? "border-zinc-900 dark:border-zinc-400 ring-1 ring-zinc-900 dark:ring-zinc-400" : "border-zinc-200")}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Due Date</Label>
                  <Input 
                    id="dueDate" 
                    type="date" 
                    className="dark:bg-zinc-900 dark:border-zinc-800"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-all">
                  <input 
                    type="checkbox" 
                    id="isRecurring" 
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-zinc-900"
                  />
                  <Label htmlFor="isRecurring" className="text-xs font-bold uppercase tracking-tighter cursor-pointer dark:text-zinc-300">Recurring Bill</Label>
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
                <Button className="bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-widest" onClick={handleSaveDue}>
                  {editingDue ? 'Save Changes' : 'Add Bill'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {sortedDues.length > 0 ? (
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-950 rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-b dark:border-zinc-800">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Description</TableHead>
                    <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Due Date</TableHead>
                    <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Category</TableHead>
                    <TableHead className="text-right font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDues.map((due) => (
                    <TableRow key={due.id} className={cn("hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors border-b dark:border-zinc-900/50 group", due.isPaid && "opacity-50 grayscale-[0.5]")}>
                      <TableCell>
                        <button onClick={() => handleTogglePaid(due)} className="text-zinc-400 dark:text-zinc-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {due.isPaid ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                          ) : (
                            <Circle className="h-6 w-6" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={cn("font-bold tracking-tight text-zinc-900 dark:text-zinc-100", due.isPaid && "line-through text-zinc-400 dark:text-zinc-600")}>{due.description}</span>
                          {due.isRecurring && (
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                              <CalendarClock className="h-2.5 w-2.5" /> Recurring
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        {format(parseISO(due.dueDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold italic uppercase text-[9px] tracking-tight bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 px-2">
                          {due.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black italic tracking-tighter text-zinc-900 dark:text-white text-lg">
                        {formatAmount(due.amount, due.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            onClick={() => openEditDialog(due)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-rose-600"
                            onClick={() => setDeleteConfirmId(due.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 text-center">
            <div className="h-16 w-16 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-6">
              <CalendarClock className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-tight text-zinc-900 dark:text-white">No bills found</h3>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mt-2 text-xs font-medium">
              You have no active bills registered for this period.
            </p>
            <Button variant="outline" className="mt-8 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest" onClick={openAddDialog}>
              Add Bill
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog 
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Due"
        description="Are you sure you want to delete this due? This action cannot be undone."
        onConfirm={handleDeleteDue}
      />
    </div>
  );
}
