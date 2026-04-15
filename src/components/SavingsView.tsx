import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Saving, CURRENCIES } from '../types';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO } from 'date-fns';
import { Trash2, Edit, Plus, PiggyBank, TrendingUp, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

interface SavingsViewProps {
  data: {
    savings: Saving[];
    loading: boolean;
  };
}

const SAVING_TYPES = ['RD', 'FD', 'Mutual Fund', 'Stocks', 'Crypto', 'Gold', 'Provident Fund', 'Other'];

export default function SavingsView({ data }: SavingsViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { savings } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    currency: preferredCurrency.code,
    type: 'RD' as Saving['type'],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    description: '',
    isRecurring: true
  });

  useEffect(() => {
    if (!editingSaving) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingSaving]);

  const openAddDialog = () => {
    setEditingSaving(null);
    setFormData({
      amount: '',
      currency: preferredCurrency.code,
      type: 'RD',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      description: '',
      isRecurring: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (saving: Saving) => {
    setEditingSaving(saving);
    setFormData({
      amount: saving.amount.toString(),
      currency: saving.currency || 'USD',
      type: saving.type,
      startDate: saving.startDate,
      endDate: saving.endDate || '',
      description: saving.description,
      isRecurring: saving.isRecurring
    });
    setIsDialogOpen(true);
  };

  const handleSaveSaving = async () => {
    if (!user) return;
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const savingData = {
        uid: user.uid,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        description: formData.description,
        isRecurring: formData.isRecurring,
        updatedAt: new Date().toISOString()
      };

      if (editingSaving) {
        await updateDoc(doc(db, 'savings', editingSaving.id), savingData);
        toast.success('Savings entry updated successfully');
      } else {
        await addDoc(collection(db, 'savings'), {
          ...savingData,
          createdAt: new Date().toISOString()
        });
        toast.success('Savings entry added successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingSaving ? OperationType.UPDATE : OperationType.CREATE, 'savings');
    }
  };

  const handleDeleteSaving = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this savings entry?')) return;
    try {
      await deleteDoc(doc(db, 'savings', id));
      toast.success('Savings entry deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'savings');
    }
  };

  const sortedSavings = [...savings].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button onClick={openAddDialog} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"><Plus className="h-4 w-4" />Add Savings</Button>} />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSaving ? 'Edit Savings' : 'Add New Savings'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                <Label htmlFor="type">Savings Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({...formData, type: v as Saving['type']})}
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
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input 
                    id="endDate" 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="e.g. Monthly RD Contribution" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isRecurring" 
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <Label htmlFor="isRecurring">Recurring Monthly</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button className="bg-zinc-900 text-white" onClick={handleSaveSaving}>
                {editingSaving ? 'Update Savings' : 'Save Savings'}
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
                <TableHead>Start Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSavings.length > 0 ? (
                sortedSavings.map((saving) => (
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
                          onClick={() => openEditDialog(saving)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-red-600"
                          onClick={() => handleDeleteSaving(saving.id)}
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
    </div>
  );
}
