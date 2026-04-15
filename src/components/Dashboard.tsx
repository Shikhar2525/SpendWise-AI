import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CalendarClock, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';
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
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Expense, Due, Salary, Budget, Goal } from '../types';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useCurrency } from '../contexts/CurrencyContext';

interface DashboardProps {
  data: {
    expenses: Expense[];
    dues: Due[];
    salaries: Salary[];
    budgets: Budget[];
    goals: Goal[];
    loading: boolean;
  };
}

export default function Dashboard({ data }: DashboardProps) {
  const { expenses, dues, salaries, budgets, goals } = data;
  const { preferredCurrency, formatAmount, convert } = useCurrency();

  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const currentMonthStats = React.useMemo(() => {
    const monthExpenses = expenses.filter(e => 
      isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd })
    );
    const monthSalaries = salaries.filter(s => 
      isWithinInterval(parseISO(s.date), { start: monthStart, end: monthEnd })
    );

    // Convert everything to preferred currency for summary
    const totalExpenses = monthExpenses.reduce((sum, e) => 
      sum + convert(e.amount, e.currency || 'USD', preferredCurrency.code), 0
    );
    const totalIncome = monthSalaries.reduce((sum, s) => 
      sum + convert(s.amount, s.currency || 'USD', preferredCurrency.code), 0
    );
    const balance = totalIncome - totalExpenses;

    return { totalExpenses, totalIncome, balance };
  }, [expenses, salaries, monthStart, monthEnd, convert, preferredCurrency.code]);

  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    expenses.forEach(e => {
      if (isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd })) {
        const convertedAmount = convert(e.amount, e.currency || 'USD', preferredCurrency.code);
        categories[e.category] = (categories[e.category] || 0) + convertedAmount;
      }
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenses, monthStart, monthEnd, convert, preferredCurrency.code]);

  const upcomingDues = React.useMemo(() => {
    return dues
      .filter(d => !d.isPaid && parseISO(d.dueDate) >= new Date())
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
      .slice(0, 5);
  }, [dues]);

  const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f5f3ff'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-200 shadow-sm overflow-hidden relative group hover:border-indigo-200 transition-colors">
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
            <p className="text-xs text-zinc-400 mt-1">For {format(new Date(), 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm overflow-hidden relative group hover:border-indigo-200 transition-colors">
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
            <p className="text-xs text-zinc-400 mt-1">For {format(new Date(), 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden relative bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
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
              <Progress value={Math.max(0, Math.min(100, (currentMonthStats.balance / currentMonthStats.totalIncome) * 100))} className="h-1.5 bg-white/20" />
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
            <div className="h-[300px] w-full">
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
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Dues */}
        <Card className="lg:col-span-3 border-zinc-200 shadow-sm">
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
        {goals.map((goal) => (
          <Card key={goal.id} className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{goal.name}</CardTitle>
                <Target className="h-4 w-4 text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <div className="text-2xl font-bold">{formatAmount(goal.currentAmount, goal.currency)}</div>
                <div className="text-xs text-zinc-500">Target: {formatAmount(goal.targetAmount, goal.currency)}</div>
              </div>
              <Progress value={(goal.currentAmount / goal.targetAmount) * 100} className="h-2" />
              <p className="text-[10px] text-zinc-400 mt-2 uppercase tracking-widest">
                Deadline: {format(parseISO(goal.deadline), 'MMM yyyy')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
