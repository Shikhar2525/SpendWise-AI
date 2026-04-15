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
import { format, parseISO } from 'date-fns';
import { Trash2, Edit, Plus, CheckCircle2, Circle, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

interface DuesViewProps {
  data: {
    dues: Due[];
    loading: boolean;
  };
}

export default function DuesView({ data }: DuesViewProps) {
  const { user } = useAuth();
  const { preferredCurrency, formatAmount } = useCurrency();
  const { dues } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<Due | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    currency: preferredCurrency.code,
    category: 'Utilities',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    isRecurring: false
  });

  useEffect(() => {
    if (!editingDue) {
      setFormData(prev => ({ ...prev, currency: preferredCurrency.code }));
    }
  }, [preferredCurrency, editingDue]);

  const openAddDialog = () => {
    setEditingDue(null);
    setFormData({
      amount: '',
      currency: preferredCurrency.code,
      category: 'Utilities',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      isRecurring: false
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
      isRecurring: due.isRecurring
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
      await updateDoc(doc(db, 'dues', due.id), {
        isPaid: !due.isPaid
      });
      toast.success(due.isPaid ? 'Marked as unpaid' : 'Marked as paid');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'dues');
    }
  };

  const handleDeleteDue = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this due?')) return;
    try {
      await deleteDoc(doc(db, 'dues', id));
      toast.success('Due deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'dues');
    }
  };

  const sortedDues = [...dues].sort((a, b) => {
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
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="e.g. Monthly Rent" 
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
                            onClick={() => handleDeleteDue(due.id)}
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
    </div>
  );
}
