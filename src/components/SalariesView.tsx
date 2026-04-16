import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
import { Trash2, Edit, Plus, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConfirmDialog } from './ui/confirm-dialog';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { expandRecurringItems } from '../lib/utils/recurringUtils';

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
    setFormData({
      amount: '',
      currency: preferredCurrency.code,
      date: format(new Date(), 'yyyy-MM-dd'),
      description: 'Monthly Salary',
      isRecurring: true,
      repeatUntil: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (salary: Salary) => {
    setEditingSalary(salary);
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
      const salaryData = {
        uid: user.uid,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        date: formData.date,
        description: formData.description,
        isRecurring: formData.isRecurring,
        repeatUntil: formData.isRecurring ? formData.repeatUntil : null,
        updatedAt: new Date().toISOString()
      };

      if (editingSalary) {
        await updateDoc(doc(db, 'salaries', editingSalary.id), salaryData);
        toast.success('Income updated successfully');
      } else {
        await addDoc(collection(db, 'salaries'), {
          ...salaryData,
          createdAt: new Date().toISOString()
        });
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
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button onClick={openAddDialog} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"><Plus className="h-4 w-4" />Add Income</Button>} />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSalary ? 'Edit Income' : 'Add New Income'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="e.g. Monthly Salary" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
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
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
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
              <Button className="bg-zinc-900 text-white" onClick={handleSaveSalary}>
                {editingSalary ? 'Update Income' : 'Save Income'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaries.length > 0 ? (
                filteredSalaries.map((salary) => (
                  <TableRow key={salary.id} className="hover:bg-zinc-50/50 transition-colors">
                    <TableCell className="font-medium">
                      {format(parseISO(salary.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{salary.description}</TableCell>
                    <TableCell>
                      {salary.isRecurring ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                          No
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      +{formatAmount(salary.amount, salary.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                          onClick={() => openEditDialog(salary)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-red-600"
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
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                    No income entries found. Add your salary to start planning!
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
