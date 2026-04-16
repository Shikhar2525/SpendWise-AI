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
  Bot
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
  Pie
} from 'recharts';
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useCurrency } from '../contexts/CurrencyContext';
import { useFinancialPeriod } from '../contexts/FinancialPeriodContext';
import { VisionaryForecast } from './VisionaryForecast';
import { expandRecurringItems } from '../lib/utils/recurringUtils';

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
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenses, monthDate, convert, preferredCurrency.code]);

  const upcomingDues = React.useMemo(() => {
    return expandedDues
      .filter(d => !d.isPaid)
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
      .slice(0, 5);
  }, [expandedDues]);

  const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f5f3ff'];

  return (
    <div className="space-y-6">
      <VisionaryForecast 
        income={currentMonthStats.totalIncome} 
        expenses={currentMonthStats.totalExpenses} 
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="border-zinc-200 shadow-sm overflow-hidden relative group hover:border-indigo-200 transition-all cursor-pointer hover:scale-[1.02]"
          onClick={() => setActiveTab('salaries')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-12 w-12 text-indigo-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Income</CardTitle>
            <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{formatAmount(currentMonthStats.totalIncome)}</div>
            <p className="text-xs text-zinc-400 mt-1">For {format(monthDate, 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card 
          className="border-zinc-200 shadow-sm overflow-hidden relative group hover:border-indigo-200 transition-all cursor-pointer hover:scale-[1.02]"
          onClick={() => setActiveTab('expenses')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="h-12 w-12 text-indigo-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Expenses</CardTitle>
            <div className="rounded-full bg-rose-50 p-2 text-rose-600">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{formatAmount(currentMonthStats.totalExpenses)}</div>
            <p className="text-xs text-zinc-400 mt-1">For {format(monthDate, 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-lg overflow-hidden relative bg-gradient-to-br from-indigo-600 to-violet-700 text-white cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => setActiveTab('budgets')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Wallet className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-100">Remaining Balance</CardTitle>
            <Wallet className="h-4 w-4 text-indigo-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(currentMonthStats.balance)}</div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={Math.max(0, Math.min(100, (currentMonthStats.balance / (currentMonthStats.totalIncome || 1)) * 100))} className="h-1.5 bg-white/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Chart */}
        <Card className="lg:col-span-4 border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Expense Breakdown ({preferredCurrency.code})</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full flex items-center justify-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#a1a1aa" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#a1a1aa" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${preferredCurrency.symbol}${value}`}
                    />
                    <Tooltip 
                      cursor={{fill: '#f5f3ff'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatAmount(value), 'Spent']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-zinc-900">No expenses recorded</p>
                  <p className="text-xs text-zinc-500">Add expenses for {format(monthDate, 'MMMM')} to see the breakdown.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Dues */}
        <Card 
          className="lg:col-span-3 border-zinc-200 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors"
          onClick={() => setActiveTab('dues')}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Upcoming Dues</CardTitle>
            <CalendarClock className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDues.length > 0 ? (
                upcomingDues.map((due) => (
                  <div key={due.id} className="flex items-center justify-between border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{due.description}</p>
                      <p className="text-xs text-zinc-500">{format(parseISO(due.dueDate), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatAmount(due.amount, due.currency)}</p>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {due.category}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-zinc-100 p-3 mb-2">
                    <AlertTriangle className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-500">No upcoming dues found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Goals Progress */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const isCompleted = progress >= 100;
          const isOverSaved = goal.currentAmount > goal.targetAmount;
          
          return (
            <Card 
              key={goal.id} 
              className="border-zinc-200 shadow-sm cursor-pointer hover:border-zinc-900 transition-all hover:shadow-md group"
              onClick={() => setActiveTab('savings')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-zinc-900">{goal.name}</CardTitle>
                  <div className={`p-1.5 rounded-lg ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                    <Target className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Saved</p>
                    <div className="text-2xl font-black text-zinc-900">{formatAmount(goal.currentAmount, goal.currency)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Target</p>
                    <div className="text-sm font-bold text-zinc-500">{formatAmount(goal.targetAmount, goal.currency)}</div>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className={`text-[10px] font-bold ${isCompleted ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {Math.round(progress)}% Complete
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {format(parseISO(goal.deadline), 'MMM yyyy')}
                    </span>
                  </div>
                  {isOverSaved && (
                    <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      <p className="text-[10px] text-emerald-700 font-bold">
                        Excellent! You have over-saved for {goal.name} with {formatAmount(goal.currentAmount - goal.targetAmount, goal.currency)} extra.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Financial Insights Section */}
      <Card className="border-none shadow-2xl bg-zinc-950 text-white overflow-hidden mt-12 relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-30 pointer-events-none" />
        <CardHeader className="pb-8 relative z-10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                <Bot className="h-7 w-7 text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight italic">AI Financial Insights</CardTitle>
                <CardDescription className="text-zinc-500 text-[10px] font-bold tracking-widest mt-1">Real-time Analysis Active</CardDescription>
              </div>
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[9px] uppercase tracking-widest px-3 py-1">Smart</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-300">Spending Habit</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                {currentMonthStats.totalExpenses > currentMonthStats.totalIncome * 0.7 
                  ? "You've spent over 70% of your income this month. Consider slowing down on non-essential purchases."
                  : "Your spending is at a healthy level. You're successfully living within your means."}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <PieChart className="h-4 w-4" />
                </div>
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-300">Top Categories</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                {categoryData.length > 0 
                  ? `Your highest spending is in ${categoryData.sort((a,b) => b.value - a.value)[0].name}. Keeping an eye on this could save you more.`
                  : "Not enough data yet to analyze your spending categories. Add some expenses to get started."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Wallet className="h-4 w-4" />
                </div>
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-300">Available Funds</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                {currentMonthStats.balance > 0 
                  ? `You have a surplus of ${formatAmount(currentMonthStats.balance)}. We suggest allocating some to your savings goals.`
                  : "You've spent more than your income. Try prioritizing essential dues and reducing extra costs."}
              </p>
            </div>
          </div>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 py-6 border-t border-white/5">
            <div className="flex items-center gap-4 text-zinc-600">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider">Status: Ready</span>
            </div>
            <Button 
              onClick={() => setActiveTab('insights')}
              className="bg-white text-black hover:bg-zinc-200 rounded-xl px-10 h-12 text-[10px] font-bold tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.05)]"
            >
              Analyze Full Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
