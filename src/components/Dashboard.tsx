import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CalendarClock, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Sparkles,
  Bot,
  Zap,
  BarChart3
} from 'lucide-react';
import { Button } from './ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { Progress, ProgressIndicator, ProgressTrack } from './ui/progress';
import { useCurrency } from '../contexts/CurrencyContext';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { VisionaryForecast } from './VisionaryForecast';
import { expandRecurringItems } from '../lib/utils/recurringUtils';
import { useTheme } from '../contexts/ThemeContext';
import { cn, formatInputText } from '../lib/utils';
import { Logo } from './Logo';
import { getCurrentFunFact } from '../lib/funFacts';

interface DashboardProps {
  data: {
    expenses: Expense[];
    dues: Due[];
    salaries: Salary[];
    budgets: Budget[];
    goals: Goal[];
    loading: boolean;
  };
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ data, setActiveTab }: DashboardProps) {
  const { expenses, dues, salaries, budgets, goals } = data;
  const { preferredCurrency, formatAmount, convert } = useCurrency();
  const { selectedMonth } = useFinancialPeriod();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const funFact = React.useMemo(() => getCurrentFunFact(), []);

  const monthDate = parseISO(`${selectedMonth}-01`);

  const expandedSalaries = React.useMemo(() => expandRecurringItems(salaries, monthDate), [salaries, monthDate]);
  const expandedDues = React.useMemo(() => {
    const expanded = expandRecurringItems(dues, monthDate);
    // Apply the same settlement filtering as DuesView
    return expanded.filter(d => {
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
    });
  }, [dues, monthDate]);

  const currentMonthStats = React.useMemo(() => {
    const monthExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), monthDate));
    const monthSalaries = expandedSalaries;

    // Convert everything to preferred currency for summary
    const totalExpenses = monthExpenses.reduce((sum, e) => 
      sum + convert(e.amount, e.currency || 'USD', preferredCurrency.code), 0
    );
    const totalIncome = monthSalaries.reduce((sum, s) => 
      sum + convert(s.amount, s.currency || 'USD', preferredCurrency.code), 0
    );
    const balance = totalIncome - totalExpenses;

    return { totalExpenses, totalIncome, balance };
  }, [expenses, expandedSalaries, convert, preferredCurrency.code]);

  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    expenses.forEach(e => {
      if (isSameMonth(parseISO(e.date), monthDate)) {
        const convertedAmount = convert(e.amount, e.currency || 'USD', preferredCurrency.code);
        categories[e.category] = (categories[e.category] || 0) + convertedAmount;
      }
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, monthDate, convert, preferredCurrency.code]);

  const upcomingDues = React.useMemo(() => {
    // Collect all dues starting from current month
    const unpaidDues = expandedDues
      .filter(d => !d.isPaid)
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

    if (unpaidDues.length > 0) {
      return unpaidDues.slice(0, 5);
    }

    // Otherwise, find the next month that has dues
    // We'll search up to 12 months ahead
    for (let i = 1; i <= 12; i++) {
      const nextMonth = new Date(monthDate);
      nextMonth.setMonth(nextMonth.getMonth() + i);
      const futureDues = expandRecurringItems(dues, nextMonth)
        .filter(d => !d.isPaid);

      if (futureDues.length > 0) {
        return futureDues
          .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
          .slice(0, 5);
      }
    }

    return [];
  }, [expandedDues, dues, monthDate]);

  const COLORS = isDark 
    ? ['#818cf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#2dd4bf']
    : ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      <VisionaryForecast 
        income={currentMonthStats.totalIncome} 
        expenses={currentMonthStats.totalExpenses} 
        funFact={funFact}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer hover:scale-[1.02] bg-white dark:bg-zinc-950"
          onClick={() => setActiveTab('salaries')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Total Income</CardTitle>
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{formatAmount(currentMonthStats.totalIncome)}</div>
            <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-wider">{format(monthDate, 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card 
          className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden relative group hover:border-rose-400 dark:hover:border-rose-500 transition-all cursor-pointer hover:scale-[1.02] bg-white dark:bg-zinc-950"
          onClick={() => setActiveTab('expenses')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingDown className="h-12 w-12 text-rose-600 dark:text-rose-400" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Total Expenses</CardTitle>
            <div className="rounded-full bg-rose-50 dark:bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{formatAmount(currentMonthStats.totalExpenses)}</div>
            <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-wider">{format(monthDate, 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-2xl shadow-indigo-500/20 overflow-hidden relative bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => setActiveTab('budgets')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-900 dark:from-indigo-100 dark:to-white opacity-90" />
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="h-12 w-12" />
          </div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold tracking-widest uppercase text-indigo-100 dark:text-indigo-900/60">Remaining Balance</CardTitle>
            <Zap className="h-4 w-4 text-indigo-300 dark:text-indigo-600" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black tracking-tight">{formatAmount(currentMonthStats.balance)}</div>
            <div className="mt-4 space-y-2">
               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-indigo-200 dark:text-indigo-600">
                  <span>Usage</span>
                  <span>{Math.max(0, Math.min(100, (currentMonthStats.totalExpenses / (currentMonthStats.totalIncome || 1)) * 100)).toFixed(1)}%</span>
               </div>
               <Progress 
                value={Math.max(0, Math.min(100, (currentMonthStats.balance / (currentMonthStats.totalIncome || 1)) * 100))} 
                className="h-2 bg-indigo-950/20 dark:bg-indigo-50"
                children={
                   <ProgressTrack className="h-full w-full bg-transparent">
                      <ProgressIndicator className="h-full bg-white dark:bg-indigo-600 transition-all duration-1000" />
                   </ProgressTrack>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Chart */}
        <Card className="lg:col-span-4 border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
          <CardHeader className="border-b border-zinc-50 dark:border-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight italic uppercase">Expenditure Flow</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Monthly Category Analysis</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[350px] w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27272a" : "#f4f4f5"} />
                    <XAxis 
                      dataKey="name" 
                      stroke={isDark ? "#71717a" : "#a1a1aa"} 
                      fontSize={11} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke={isDark ? "#71717a" : "#a1a1aa"} 
                      fontSize={11} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${preferredCurrency.symbol}${value}`}
                    />
                    <Tooltip 
                      cursor={{fill: isDark ? '#27272a' : '#f5f3ff'}}
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                        background: isDark ? '#18181b' : '#fff',
                        padding: '16px'
                      }}
                      itemStyle={{ fontWeight: 'bold' }}
                      labelStyle={{ marginBottom: '8px', fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}
                      formatter={(value: number) => [formatAmount(value), 'Total Amount']}
                    />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={45}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase italic text-zinc-900 dark:text-zinc-100">Silence in the numbers</p>
                    <p className="text-xs text-zinc-500 max-w-[200px] mt-1">No transactions recorded for this period yet.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown (Pie) */}
        <Card className="lg:col-span-3 border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
          <CardHeader className="border-b border-zinc-50 dark:border-zinc-900">
            <CardTitle className="text-lg font-black tracking-tight italic uppercase">Market Share</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Spent Allocation</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[250px] w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        background: isDark ? '#18181b' : '#fff',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                   <div className="h-40 w-40 rounded-full border-8 border-zinc-50 dark:border-zinc-900 border-dashed" />
                </div>
              )}
            </div>
            <div className="mt-8 space-y-3">
               {categoryData.slice(0, 3).map((cat, i) => (
                 <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">{cat.name}</span>
                    </div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                      {((cat.value / currentMonthStats.totalExpenses) * 100).toFixed(1)}%
                    </span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         {/* Upcoming Dues */}
         <Card 
          className="border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors bg-white dark:bg-zinc-950"
          onClick={() => setActiveTab('dues')}
        >
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-50 dark:border-zinc-900 mb-6">
            <div>
              <CardTitle className="text-lg font-black tracking-tight italic uppercase">Upcoming Bills</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Bills due soon</CardDescription>
            </div>
            <CalendarClock className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {upcomingDues.length > 0 ? (
                upcomingDues.map((due) => (
                  <div key={due.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-600 transition-colors group-hover:bg-amber-50 group-hover:text-amber-500 dark:group-hover:bg-amber-500/10">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">
                          {formatInputText(due.description)}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{format(parseISO(due.dueDate), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-900 dark:text-white">{formatAmount(due.amount, due.currency)}</p>
                      <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-zinc-200 dark:border-zinc-800">
                        {due.category}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-3xl bg-zinc-50 dark:bg-zinc-900 p-4 mb-4">
                    <CalendarClock className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">All caught up</p>
                  <p className="text-[10px] text-zinc-400 italic">No upcoming bills found</p>
                </div>
              )}
            </div>
            {upcomingDues.length > 0 && (
              <div className="mt-8 pt-6 border-t border-zinc-50 dark:border-zinc-900">
                <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-600">
                  Full Calendar View
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings Goals */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-lg font-black uppercase italic tracking-tighter">Savings Goals</h3>
             <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] uppercase tracking-widest">Active</Badge>
          </div>
          <div className="grid gap-4">
            {goals.slice(0, 3).map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const isCompleted = progress >= 100;
              
              return (
                <Card 
                  key={goal.id} 
                  className="border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer hover:scale-[1.02] transition-all bg-white dark:bg-zinc-950 group"
                  onClick={() => setActiveTab('savings')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                           <Target className="h-5 w-5" />
                         </div>
                         <p className="font-black italic uppercase text-sm">{formatInputText(goal.name)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Target Met</span>
                        <p className={`text-sm font-black ${isCompleted ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                          {progress.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                       <Progress 
                        value={Math.min(100, progress)} 
                        className={cn(
                          "h-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-50 dark:border-zinc-800",
                          isCompleted ? "bg-emerald-500" : ""
                        )}
                        children={
                          <ProgressTrack className="h-full w-full bg-transparent">
                            <ProgressIndicator 
                              className={cn(
                                "h-full transition-all duration-1000",
                                isCompleted ? "bg-emerald-500" : "bg-indigo-500 dark:bg-indigo-400"
                              )} 
                            />
                          </ProgressTrack>
                        }
                      />
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                         <span>{formatAmount(goal.currentAmount, goal.currency)}</span>
                         <span>{formatAmount(goal.targetAmount, goal.currency)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Financial Insights Section */}
      <Card className="border border-zinc-100 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 overflow-hidden mt-12 relative group rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-30 pointer-events-none" />
        
        <CardHeader className="pb-8 relative z-10 border-b border-zinc-50 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center shadow-sm flex-shrink-0">
                <Bot className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight italic uppercase">Decision Intelligence</CardTitle>
                <CardDescription className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold tracking-widest mt-1">Real-time Financial Modeling</CardDescription>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
               <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-widest">Active Insight</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-10">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">Outlook</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-bold italic uppercase">
                {currentMonthStats.totalExpenses > currentMonthStats.totalIncome * 0.7 
                  ? "Caution: High spending. Consider reducing costs."
                  : "Spending is healthy. You're doing great this month."}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20">
                  <PieChart className="h-4 w-4" />
                </div>
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">Categories</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-bold italic uppercase">
                {categoryData.length > 0 
                  ? `Most spending is in ${categoryData.sort((a,b) => b.value - a.value)[0].name}.`
                  : "Analyzing your spending history for insights."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                  <Wallet className="h-4 w-4" />
                </div>
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">Savings</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-bold italic uppercase">
                {currentMonthStats.balance > 0 
                  ? `You have ${formatAmount(currentMonthStats.balance)} left. Great for savings!`
                  : "Budget is tight. Look for ways to save more."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">Strategic Insight</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-bold italic uppercase">
                {currentMonthStats.balance > currentMonthStats.totalIncome * 0.3 
                   ? "You are maintaining high liquidity. Strategic investments recommended."
                   : "Focus on consolidating small wins to build momentum."}
              </p>
            </div>
          </div>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-t border-zinc-50 dark:border-zinc-800">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 flex items-center justify-center p-2 rounded-full border border-zinc-100 dark:border-zinc-800">
                    <Logo className="h-6 w-6 grayscale opacity-30 dark:opacity-50" />
                 </div>
                 <div>
                   <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Processing Node</p>
                   <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">Region: Asia-East</p>
                 </div>
               </div>
            </div>
            <Button 
              onClick={() => setActiveTab('insights')}
              className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-2xl px-12 h-14 text-[10px] font-bold tracking-widest shadow-xl uppercase italic"
            >
              Analyze Strategic Depth
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
