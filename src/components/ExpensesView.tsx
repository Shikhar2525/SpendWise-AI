import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Expense, CATEGORIES, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO, isSameMonth } from 'date-fns';
import { Logo } from './Logo';
import { Trash2, Edit, Plus, Search, Download, Sparkles, CheckCircle2, Calendar, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { suggestCategory } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import debounce from 'lodash/debounce';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { cn } from '../lib/utils';

interface ExpensesViewProps {
  data: {
    expenses: Expense[];
    loading: boolean;
  };
}

export default function ExpensesView({ data }: ExpensesViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { selectedMonth } = useFinancialPeriod();
  const { expenses } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    currency: preferredCurrency.code,
    category: 'Other',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  // Update formData when preferredCurrency changes or dialog opens for new expense
  useEffect(() => {
    if (!editingExpense) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingExpense]);

  const debouncedSuggest = useCallback(
    debounce(async (desc: string) => {
      if (desc.length < 3 || editingExpense) return;
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
    [editingExpense]
  );

  useEffect(() => {
    if (formData.description && !editingExpense) {
      debouncedSuggest(formData.description);
    }
  }, [formData.description, debouncedSuggest, editingExpense]);

  const openAddDialog = () => {
    setEditingExpense(null);
    setFormData({
      amount: '',
      currency: preferredCurrency.code,
      category: 'Other',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      currency: expense.currency || 'USD',
      category: expense.category,
      date: expense.date,
      description: expense.description
    });
    setIsDialogOpen(true);
  };

  const exportToCSV = () => {
    if (expenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(e => [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        e.category,
        e.amount,
        e.currency || 'USD'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Expenses exported to CSV');
  };

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const monthDate = parseISO(`${selectedMonth}-01`);

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

  const handleSaveExpense = async () => {
    if (!user) return;
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const expenseData = {
        uid: user.uid,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category,
        date: formData.date,
        description: formData.description,
        updatedAt: new Date().toISOString()
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), expenseData);
        toast.success('Expense updated successfully');
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...expenseData,
          createdAt: new Date().toISOString()
        });
        toast.success('Expense added successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingExpense ? OperationType.UPDATE : OperationType.CREATE, 'expenses');
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'expenses', deleteConfirmId));
      toast.success('Expense deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'expenses');
    }
  };

  const filteredExpenses = expenses
    .filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = isSameMonth(parseISO(e.date), monthDate);
      return matchesSearch && matchesMonth;
    })
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100/50 dark:border-rose-500/20">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight italic">Expenses</h2>
              <Logo className="h-5 w-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Manage and track your daily spending</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input 
              placeholder="Filter transactions..." 
              className="pl-10 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 h-10 rounded-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} className="gap-2 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 h-10 rounded-xl transition-all font-bold uppercase text-[10px] tracking-widest">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              render={
                <Button onClick={openAddDialog} className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white gap-2 h-10 rounded-xl shadow-lg shadow-rose-200 dark:shadow-none font-black uppercase text-[10px] tracking-widest">
                  <Plus className="h-4 w-4" /> Add Record
                </Button>
              }
            />
              <DialogContent className="sm:max-w-[425px] dark:bg-zinc-950 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="font-black italic text-xl dark:text-white">{editingExpense ? 'Modify Entry' : 'New Transaction'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Transaction Details</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="description" 
                        placeholder="e.g. Starbucks Coffee" 
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
                        title="Suggest category with AI"
                      >
                        <Sparkles className={`h-4 w-4 ${isSuggesting ? 'animate-pulse' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Classification</Label>
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
                      <AnimatePresence>
                        {isAutoAssigning && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute -right-2 -top-2"
                          >
                            <Badge className="bg-rose-600 text-white flex items-center gap-1 text-[10px] px-1.5 py-0.5 border-none">
                              <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                              AI Sourcing...
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                    <Label htmlFor="date" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Processing Date</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      className="dark:bg-zinc-900 dark:border-zinc-800"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest" onClick={handleSaveExpense}>
                    {editingExpense ? 'Update Transaction' : 'Confirm Record'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-950 rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-b dark:border-zinc-800">
                <TableHead className="w-[150px] font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Date</TableHead>
                <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Description</TableHead>
                <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Category</TableHead>
                <TableHead className="text-right font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors border-b dark:border-zinc-900/50 group">
                    <TableCell className="font-bold text-zinc-900 dark:text-zinc-100">
                      {format(parseISO(expense.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400 font-medium">{expense.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-bold italic uppercase text-[9px] tracking-tight bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-none px-2">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black italic tracking-tighter text-zinc-900 dark:text-white text-lg">
                      {formatAmount(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          onClick={() => openEditDialog(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-rose-600"
                          onClick={() => setDeleteConfirmId(expense.id)}
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
                      <Receipt className="h-8 w-8 opacity-20" />
                      <p>No transactions found for the selected period.</p>
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
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDeleteExpense}
      />
    </div>
  );
}
