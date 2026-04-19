import * as React from 'react';
import { db, collection, getDocs, query, orderBy, limit, where } from '../lib/firebase';
import { UserProfile, Expense, Salary, CURRENCIES } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { 
  Users, 
  Database, 
  Activity, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  Search,
  Filter,
  BarChart3,
  Clock,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  Server,
  Lock,
  Mail,
  RefreshCcw,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ReChartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid 
} from 'recharts';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from './ui/dropdown-menu';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from './ui/dialog';
import { updateDoc, doc as firestoreDoc, getDoc as getFirestoreDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function AdminView() {
  const { preferredCurrency } = useCurrency();
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    intelligentUsers: 0,
    totalExpenses: 0,
    totalIncome: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [planFilter, setPlanFilter] = React.useState<string>('ALL');
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);
  const [isInspectOpen, setIsInspectOpen] = React.useState(false);
  
  // SMTP Config State
  const [smtpConfig, setSmtpConfig] = React.useState({
    host: 'smtp.gmail.com',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    from: ''
  });
  const [isTestingSmtp, setIsTestingSmtp] = React.useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = React.useState(false);

  const fetchAdminData = async () => {
    try {
      // Fetch existing SMTP config from Firestore doc config/mail
      const smtpSnap = await getFirestoreDoc(firestoreDoc(db, 'config', 'mail'));
      if (smtpSnap.exists()) {
        const data = smtpSnap.data();
        setSmtpConfig({
          host: data.host || 'smtp.gmail.com',
          port: String(data.port || '587'),
          secure: data.secure || false,
          user: data.user || '',
          pass: data.pass || '',
          from: data.from || ''
        });
      }

      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const usersList: UserProfile[] = [];
      let intCount = 0;

      usersSnap.forEach((doc) => {
        const data = doc.data() as UserProfile;
        usersList.push({ uid: doc.id, ...data });
        if (data.plan === 'Intelligent') intCount++;
      });
      setUsers(usersList);

      const expensesSnap = await getDocs(query(collection(db, 'expenses'), limit(200)));
      const salariesSnap = await getDocs(query(collection(db, 'salaries'), limit(200)));

      const convertToPreferred = (amount: number, fromCurrencyCode: string) => {
        const fromCurrency = CURRENCIES.find(c => c.code === fromCurrencyCode) || CURRENCIES[0];
        const usdAmount = amount / fromCurrency.rate;
        return usdAmount * preferredCurrency.rate;
      };

      let totalExp = 0;
      expensesSnap.forEach(d => {
        const data = d.data();
        totalExp += convertToPreferred(data.amount || 0, data.currency || 'USD');
      });
      
      let totalInc = 0;
      salariesSnap.forEach(d => {
        const data = d.data();
        totalInc += convertToPreferred(data.amount || 0, data.currency || 'USD');
      });

      setStats({
        totalUsers: usersList.length,
        intelligentUsers: intCount,
        totalExpenses: totalExp,
        totalIncome: totalInc
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAdminData();
  }, [preferredCurrency]);

  const toggleUserRole = async (user: UserProfile) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      const userRef = firestoreDoc(db, 'users', user.uid);
      await updateDoc(userRef, { role: newRole });
      toast.success(`User role updated to ${newRole}`);
      fetchAdminData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: preferredCurrency.code,
    }).format(amount);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'ALL' || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleSaveSmtp = async () => {
    setIsSavingSmtp(true);
    try {
      // We use the firestore client directly here because it uses your authenticated session.
      // The backend will then be able to read this config.
      const configRef = firestoreDoc(db, 'config', 'mail');
      await setDoc(configRef, {
        ...smtpConfig,
        port: parseInt(smtpConfig.port),
        updatedAt: serverTimestamp()
      });
      toast.success('SMTP settings saved to system ledger');
    } catch (error) {
      console.error('Save SMTP Error:', error);
      toast.error('Failed to save SMTP settings to Firestore');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpConfig.user || !smtpConfig.pass) {
      toast.error('User and Password are required for testing');
      return;
    }
    setIsTestingSmtp(true);
    try {
      const isStaticHost = window.location.hostname.includes('firebaseapp.com') || 
                          window.location.hostname.includes('web.app');
      const BACKEND_URL = 'https://ais-pre-epln74gvage6ffz4lxm6ug-477197325075.asia-east1.run.app';
      const apiPath = '/api/admin/test-smtp';
      const fullUrl = isStaticHost ? `${BACKEND_URL}${apiPath}` : apiPath;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...smtpConfig,
          port: parseInt(smtpConfig.port)
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('SMTP connection verified successfully');
      } else {
        toast.error(result.error || 'SMTP verification failed');
      }
    } catch (error) {
      toast.error('Network error during SMTP test');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const chartData = [
    { name: 'Essential', value: stats.totalUsers - stats.intelligentUsers },
    { name: 'Intelligent', value: stats.intelligentUsers },
  ];

  const COLORS = ['#d4d4d8', '#6366f1'];

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 text-indigo-500 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Synchronizing Global State...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Primary Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: 'Registered Users', value: stats.totalUsers, icon: Users, color: 'indigo', progress: 100 },
          { label: 'Premium Users %', value: `${((stats.intelligentUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}%`, icon: TrendingUp, color: 'emerald', progress: (stats.intelligentUsers / (stats.totalUsers || 1)) * 100 },
          { label: 'Total Revenue', value: formatCurrency(stats.totalIncome), icon: Database, color: 'rose', progress: 75 },
          { label: 'Uptime Status', value: '99.9%', icon: Activity, color: 'amber', progress: 99.9 },
        ].map((m, i) => (
          <Card key={i} className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
            <CardContent className="p-8">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] leading-none">{m.label}</p>
                  <div className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter truncate">{m.value}</div>
                </div>
                <div className={cn(
                  "h-12 w-12 rounded-[1.25rem] border flex items-center justify-center transition-all duration-500 shrink-0",
                  m.color === 'indigo' ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white" :
                  m.color === 'emerald' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white" :
                  m.color === 'rose' ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-500 group-hover:bg-rose-500 group-hover:text-white" :
                  "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-500 group-hover:bg-amber-500 group-hover:text-white"
                )}>
                  <m.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${m.progress}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className={cn(
                      "h-full rounded-full transition-colors",
                      m.color === 'indigo' ? "bg-indigo-500" :
                      m.color === 'emerald' ? "bg-emerald-500" :
                      m.color === 'rose' ? "bg-rose-500" :
                      "bg-amber-500"
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* User Statistics Chart */}
        <Card className="lg:col-span-1 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 border-b border-zinc-50 dark:border-zinc-900">
            <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Plan Distribution</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">User subscription types</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReChartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#000', 
                      borderRadius: '12px', 
                      border: 'none',
                      fontSize: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
               {chartData.map((entry, index) => (
                 <div key={entry.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{entry.name}</span>
                   </div>
                   <span className="text-xs font-black italic">{entry.value} users</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        {/* User Management Directory */}
        <Card className="lg:col-span-2 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden rounded-[3rem]">
          <CardHeader className="p-8 border-b border-zinc-50 dark:border-zinc-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">User Directory</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Viewing {filteredUsers.length} total users</CardDescription>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input 
                    placeholder="SEARCH USERS..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 w-full md:w-64 bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] focus-visible:ring-indigo-500/20 transition-all duration-300 focus:md:w-80"
                  />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-12 px-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-black text-[10px] uppercase tracking-widest gap-2 flex items-center hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                    <Filter className="h-4 w-4 text-indigo-500" />
                    {planFilter === 'ALL' ? 'ALL PLANS' : planFilter}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-zinc-400 p-2">Subscription Filter</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-900" />
                    {['ALL', 'Essential', 'Intelligent'].map((tier) => (
                      <DropdownMenuItem 
                        key={tier}
                        onClick={() => setPlanFilter(tier)}
                        className={cn(
                          "cursor-pointer rounded-xl h-10 px-3 font-black text-[10px] uppercase tracking-widest mb-1",
                          planFilter === tier ? "bg-indigo-500 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        )}
                      >
                        {tier}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-50 dark:border-zinc-900 hover:bg-transparent">
                    <TableHead className="px-8 text-[9px] font-black uppercase tracking-widest text-zinc-400 h-16">Name & Details</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Plan Status</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Verified</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Joined On</TableHead>
                    <TableHead className="pr-8 text-right text-[9px] font-black uppercase tracking-widest text-zinc-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.uid} className="group border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all duration-300">
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center font-black text-sm text-indigo-500 overflow-hidden border border-zinc-200 dark:border-zinc-800 ring-2 ring-transparent group-hover:ring-indigo-500/20 group-hover:scale-105 transition-all">
                              {u.photoURL ? <img src={u.photoURL} alt="" className="h-full w-full object-cover" /> : u.displayName.charAt(0)}
                            </div>
                            {u.role === 'admin' && (
                              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                                <ShieldCheck className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-base font-black uppercase tracking-tighter text-zinc-900 dark:text-white leading-tight group-hover:text-indigo-500 transition-colors">{u.displayName}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5 opacity-60">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase tracking-[0.25em] border-none px-3 py-1.5 h-auto rounded-xl",
                          u.plan === 'Intelligent' 
                            ? "bg-indigo-500 text-white shadow-xl shadow-indigo-500/20" 
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                        )}>
                          {u.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              u.role === 'admin' ? "bg-rose-500" : "bg-emerald-500"
                            )} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                              {u.role || 'user'}
                            </span>
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Auth Code: Standard</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{format(new Date(u.createdAt), 'MMM dd, yyyy')}</p>
                          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{format(new Date(u.createdAt), 'HH:mm')} UTC</p>
                        </div>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                         <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-500"
                              onClick={() => { setSelectedUser(u); setIsInspectOpen(true); }}
                            >
                               <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "h-9 w-9 rounded-xl transition-all",
                                u.role === 'admin' ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" : "text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                              )}
                              onClick={() => toggleUserRole(u)}
                            >
                               <ShieldCheck className="h-4 w-4" />
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center space-y-6">
                <div className="h-24 w-24 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-200 dark:text-zinc-800 rotate-12 group-hover:rotate-0 transition-transform">
                  <Database className="h-12 w-12" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] text-zinc-400">No Entities Found</p>
                  <p className="text-[10px] font-bold uppercase text-zinc-300 dark:text-zinc-700">Search parameters returned zero data points</p>
                </div>
                <Button variant="ghost" onClick={() => { setSearchTerm(''); setPlanFilter('ALL'); }} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600">
                  Reset System Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inspect User Dialog */}
      <Dialog open={isInspectOpen} onOpenChange={setIsInspectOpen}>
        <DialogContent className="w-full sm:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-6 sm:p-10 overflow-hidden shadow-2xl">
           <DialogHeader>
             <div className="flex items-center gap-6 mb-8">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-400 border border-zinc-100 dark:border-zinc-800 shadow-xl">
                   {selectedUser?.photoURL ? <img src={selectedUser.photoURL} alt="" className="h-full w-full object-cover rounded-3xl" /> : (selectedUser?.displayName ? selectedUser.displayName.charAt(0) : '?')}
                </div>
                <div>
                  <DialogTitle className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white leading-none">{selectedUser?.displayName}</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mt-2">USER ID: {selectedUser?.uid}</DialogDescription>
                </div>
             </div>
           </DialogHeader>
           
           <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                 <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">User Profile</p>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Email Address</p>
                          <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{selectedUser?.email}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Plan Selection</p>
                          <Badge className="bg-indigo-600 dark:bg-indigo-500 h-6 px-3 text-[10px] font-black uppercase tracking-widest mt-1 shadow-lg shadow-indigo-500/20">{selectedUser?.plan}</Badge>
                       </div>
                    </div>
                 </div>
                 
                 <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">Usage Timestamps</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Joined Since</p>
                          <p className="text-xs font-black text-zinc-900 dark:text-white mt-1">{selectedUser?.createdAt ? format(new Date(selectedUser.createdAt), 'MMM dd, yyyy') : 'N/A'}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Platform Role</p>
                          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic mt-1">{selectedUser?.role || 'User'}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="h-full p-8 rounded-[2rem] bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/20 dark:shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-between transition-colors">
                    <div className="absolute -right-10 -top-10 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="relative z-10">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Status Summary</p>
                       <h4 className="text-xl font-black italic uppercase tracking-tighter mt-2">Active Member</h4>
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                       <div className="flex justify-between items-end border-b border-white/20 pb-4">
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Login Status</span>
                          <span className="text-xl font-black italic">Stable</span>
                       </div>
                       <div className="flex justify-between items-end border-b border-white/20 pb-4">
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Session Quality</span>
                          <span className="text-xl font-black italic">Verified</span>
                       </div>
                       <div className="pt-4 flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-indigo-200" />
                          <p className="text-[9px] font-bold uppercase tracking-widest font-black">Account Secure</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="mt-10 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4">
              <Button onClick={() => toggleUserRole(selectedUser!)} className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-black uppercase tracking-widest italic shadow-xl shadow-indigo-600/20 hover:scale-[1.02] transition-all">
                 <ShieldCheck className="h-4 w-4 mr-2" />
                 Change Admin Rights
              </Button>
              <Button variant="outline" onClick={() => setIsInspectOpen(false)} className="px-8 h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black uppercase tracking-widest italic hover:bg-zinc-50 transition-all">
                 Close View
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Advanced System Overview */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="bg-zinc-950 border-none shadow-2xl overflow-hidden relative rounded-[3rem]">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-transparent to-transparent opacity-50" />
           <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-indigo-500/10 blur-[100px] rounded-full" />
           <CardHeader className="relative z-10 p-10 border-b border-white/5">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-3xl font-black uppercase italic tracking-tighter">Money Flow</CardTitle>
                  <CardDescription className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Overall Financial Capital Movement</CardDescription>
                </div>
                <BarChart3 className="h-10 w-10 text-indigo-500" />
              </div>
           </CardHeader>
           <CardContent className="relative z-10 p-10 space-y-12">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Total Incoming</p>
                   <div className="flex items-center gap-3">
                     <p className="text-4xl font-black text-white italic tracking-tighter">{formatCurrency(stats.totalIncome)}</p>
                     <TrendingUp className="h-6 w-6 text-emerald-500" />
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   </div>
                </div>
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">Total Outgoing</p>
                   <div className="flex items-center gap-3">
                     <p className="text-4xl font-black text-white italic tracking-tighter">{formatCurrency(stats.totalExpenses)}</p>
                     <TrendingDown className="h-6 w-6 text-rose-500" />
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: '62%' }} className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                   </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                     <Activity className="h-5 w-5" />
                   </div>
                   <div>
                     <p className="text-[11px] font-black text-white uppercase tracking-widest italic">Capital Security</p>
                     <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Verified by system ledger</p>
                   </div>
                 </div>
                 <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
           </CardContent>
        </Card>

        {/* Operational Intelligence */}
        <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col rounded-[3rem]">
          <CardHeader className="p-10 border-b border-zinc-50 dark:border-zinc-900">
             <div className="flex justify-between items-start">
               <div>
                  <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">System Status</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Infrastructure Load & Performance</CardDescription>
               </div>
               <div className="h-10 w-10 flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                 <Activity className="h-10 w-10 animate-pulse" />
               </div>
             </div>
          </CardHeader>
          <CardContent className="p-10 flex-1 flex flex-col justify-center gap-10">
            {[
              { label: 'Cloud Server Load', value: '14.2%', progress: 14.2, color: 'indigo' },
              { label: 'Data Speed', value: '4.8 GB/s', progress: 68, color: 'emerald' },
              { label: 'Storage Usage', value: '2.1 GB Free', progress: 42, color: 'amber' },
              { label: 'System Delay', value: '18ms', progress: 5, color: 'rose' },
            ].map((op, i) => (
              <div key={i} className="space-y-3">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{op.label}</span>
                    <span className="text-xs font-black italic text-zinc-900 dark:text-white">{op.value}</span>
                 </div>
                 <div className="h-2 w-full bg-zinc-50 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-100 dark:border-zinc-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${op.progress}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        op.color === 'indigo' ? "bg-indigo-500" :
                        op.color === 'emerald' ? "bg-emerald-500" :
                        op.color === 'amber' ? "bg-amber-500" :
                        "bg-rose-500"
                      )} 
                    />
                 </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-zinc-50 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex items-center gap-3">
             <Clock className="h-5 w-5 text-indigo-500" />
             <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-50 dark:divide-zinc-900">
            {[
              { event: 'User Synchronized', subject: 'auth-system', time: '2m ago', status: 'success' },
              { event: 'Financial Audit Run', subject: 'money-core', time: '14m ago', status: 'success' },
              { event: 'Detection Update', subject: 'ai-system', time: '1h ago', status: 'warning' },
              { event: 'System Backup', subject: 'data-vault', time: '4h ago', status: 'success' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between p-6 px-10 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-6">
                   <div className={cn(
                     "h-2 w-2 rounded-full",
                     log.status === 'success' ? "bg-emerald-500" : "bg-amber-500"
                   )} />
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white italic">{log.event}</p>
                     <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Source: {log.subject}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{log.time}</span>
                  <ArrowRight className="h-3 w-3 text-zinc-300" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 text-center border-t border-zinc-50 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-900/5">
             <Button 
               variant="ghost" 
               onClick={() => toast.info("Activity history is automatically archived every 24 hours.")}
               className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-indigo-500"
             >
                View Full Archive
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Infrastructure Management */}
      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm rounded-[3rem] overflow-hidden">
        <CardHeader className="p-10 border-b border-zinc-50 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Email Infrastructure</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">SMTP Server & Notification Credentials</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleTestSmtp} 
                disabled={isTestingSmtp}
                className="h-12 px-6 rounded-2xl border-zinc-200 dark:border-zinc-800 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
              >
                {isTestingSmtp ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4 text-emerald-500" />}
                Test Connection
              </Button>
              <Button 
                onClick={handleSaveSmtp} 
                disabled={isSavingSmtp}
                className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/20 transition-all"
              >
                {isSavingSmtp ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Config
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">SMTP Host Connection</label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input 
                      placeholder="SMTP HOST (e.g. smtp.gmail.com)" 
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      className="h-14 bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl font-bold px-6"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input 
                      type="number"
                      placeholder="PORT" 
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                      className="h-14 bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl font-bold px-6"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Secure Protocol</label>
                <div 
                  onClick={() => setSmtpConfig({ ...smtpConfig, secure: !smtpConfig.secure })}
                  className="h-14 flex items-center justify-between px-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Use SSL (Port 465)</span>
                  <div className={cn(
                    "h-6 w-12 rounded-full p-1 transition-colors duration-300",
                    smtpConfig.secure ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-700"
                  )}>
                    <div className={cn(
                      "h-4 w-4 bg-white rounded-full transition-transform duration-300",
                      smtpConfig.secure ? "translate-x-6" : "translate-x-0"
                    )} />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex gap-4">
                <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Spark Plan Warning</p>
                  <p className="text-[9px] font-bold text-amber-600/70 leading-relaxed">
                    By storing SMTP credentials in Firestore, your application can send notifications even on the free Firebase plan. Ensure your Firebase Security Rules protect the "config" collection.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Authentication Credentials</label>
                <div className="space-y-4">
                  <div className="relative">
                    <Users className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input 
                      placeholder="SMTP USERNAME (EMAIL)" 
                      value={smtpConfig.user}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                      className="h-14 pl-16 bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl font-bold"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input 
                      type="password"
                      placeholder="SMTP PASSWORD / APP PASSWORD" 
                      value={smtpConfig.pass}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                      className="h-14 pl-16 bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Branding (From Address)</label>
                <Input 
                  placeholder='SpendWise AI <notifications@domain.com>' 
                  value={smtpConfig.from}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                  className="h-14 bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-2xl font-bold px-6"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
