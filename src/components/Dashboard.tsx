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
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ data, setActiveTab }: DashboardProps) {
  const { expenses, dues, salaries, budgets, goals } = data;
  const { preferredCurrency, formatAmount, convert } = useCurrency();

  const [selectedMonth, setSelectedMonth] = React.useState(format(new Date(), 'yyyy-MM'));

  const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
  const monthEnd = endOfMonth(parseISO(`${selectedMonth}-01`));

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

  const monthSuggestions = React.useMemo(() => {
    const suggestions = [];
    for (let i = -2; i <= 2; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      suggestions.push(format(date, 'yyyy-MM'));
    }
    return suggestions;
  }, []);

  return (
    <div className="space-y-6">
      {/* Month Selection */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <span className="text-sm font-medium text-zinc-500">Viewing data for:</span>
        <div className="flex flex-wrap gap-2">
          {monthSuggestions.map(m => (
            <Button
              key={m}
              variant={selectedMonth === m ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMonth(m)}
              className="rounded-full px-4"
            >
              {format(parseISO(`${m}-01`), 'MMM yyyy')}
            </Button>
          ))}
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-full border border-zinc-200 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

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
            <p className="text-xs text-zinc-400 mt-1">For {format(monthStart, 'MMMM yyyy')}</p>
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
            <p className="text-xs text-zinc-400 mt-1">For {format(monthStart, 'MMMM yyyy')}</p>
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

      {/* AI Insights Section */}
      <Card className="border-none shadow-xl bg-zinc-900 text-white overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold">SpendWise AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm font-semibold text-indigo-300 mb-1">Spending Trend</h4>
              <p className="text-sm text-zinc-300">
                {currentMonthStats.totalExpenses > currentMonthStats.totalIncome * 0.7 
                  ? "Your spending is high this month. Consider reviewing your non-essential expenses."
                  : "Great job! Your spending is well within your income limits."}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm font-semibold text-indigo-300 mb-1">Top Category</h4>
              <p className="text-sm text-zinc-300">
                {categoryData.length > 0 
                  ? `You've spent the most on ${categoryData.sort((a,b) => b.value - a.value)[0].name} this month.`
                  : "No spending data available yet for this month."}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm font-semibold text-indigo-300 mb-1">Savings Potential</h4>
              <p className="text-sm text-zinc-300">
                {currentMonthStats.balance > 0 
                  ? `You can potentially save ${formatAmount(currentMonthStats.balance)} more this month.`
                  : "Try to reduce expenses to start building your savings."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-xs text-zinc-500">Add expenses for {format(monthStart, 'MMMM')} to see the breakdown.</p>
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
              className="border-zinc-200 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors"
              onClick={() => setActiveTab('goals')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{goal.name}</CardTitle>
                  <Target className={`h-4 w-4 ${isCompleted ? 'text-emerald-500' : 'text-zinc-400'}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-2">
                  <div className="text-2xl font-bold">{formatAmount(goal.currentAmount, goal.currency)}</div>
                  <div className="text-xs text-zinc-500">Target: {formatAmount(goal.targetAmount, goal.currency)}</div>
                </div>
                <div className="relative pt-1">
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  {isOverSaved && (
                    <p className="text-[10px] text-emerald-600 font-medium mt-1">
                      🎉 You have over saved for this {goal.name} goal!
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 uppercase tracking-widest">
                  Deadline: {format(parseISO(goal.deadline), 'MMM yyyy')}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
