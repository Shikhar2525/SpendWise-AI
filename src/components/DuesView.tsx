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
import { Trash2, Edit, Plus, CheckCircle2, Circle, CalendarClock, Sparkles, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { suggestCategory } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { useCallback } from 'react';
import debounce from 'lodash/debounce';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { expandRecurringItems } from '../lib/utils/recurringUtils';

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
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button onClick={openAddDialog} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"><Plus className="h-4 w-4" />Add Due</Button>} />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingDue ? 'Edit Due' : 'Add New Due'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <div className="flex gap-2">
                  <Input 
                    id="description" 
                    placeholder="e.g. Monthly Rent" 
                    className="flex-1"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    className="shrink-0 text-zinc-900 border-zinc-200 hover:bg-zinc-50"
                    onClick={handleSuggestCategory}
                    disabled={isSuggesting}
                    title="Suggest category with AI"
                  >
                    <Sparkles className={`h-4 w-4 ${isSuggesting ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <div className="relative">
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger className={isAutoAssigning ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AnimatePresence>
                    {isAutoAssigning && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -right-2 -top-2"
                      >
                        <Badge className="bg-zinc-900 text-white flex items-center gap-1 text-[10px] px-1.5 py-0.5">
                          <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                          AI Auto-assigning...
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
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
                        <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input 
                  id="dueDate" 
                  type="date" 
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isRecurring" 
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <Label htmlFor="isRecurring" className="text-sm font-medium">Recurring Monthly</Label>
              </div>
              {formData.isRecurring && (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="repeatUntil">Repeat Until (Optional)</Label>
                  <Input 
                    id="repeatUntil" 
                    type="date" 
                    value={formData.repeatUntil}
                    onChange={(e) => setFormData({...formData, repeatUntil: e.target.value})}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button className="bg-zinc-900 text-white" onClick={handleSaveDue}>
                {editingDue ? 'Update Due' : 'Save Due'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {sortedDues.length > 0 ? (
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDues.map((due) => (
                    <TableRow key={due.id} className={`hover:bg-zinc-50/50 transition-colors ${due.isPaid ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <button onClick={() => handleTogglePaid(due)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                          {due.isPaid ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={`font-medium ${due.isPaid ? 'line-through' : ''}`}>{due.description}</span>
                          {due.isRecurring && (
                            <span className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" /> Recurring
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(due.dueDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {due.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatAmount(due.amount, due.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                            onClick={() => openEditDialog(due)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-red-600"
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
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-zinc-200 text-center">
            <div className="rounded-full bg-zinc-50 p-4 mb-4">
              <CalendarClock className="h-8 w-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">No upcoming dues</h3>
            <p className="text-zinc-500 max-w-xs mx-auto mt-1">
              Keep track of your bills and recurring payments here.
            </p>
            <Button variant="outline" className="mt-6" onClick={openAddDialog}>
              Add your first due
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
