import * as React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useFinancialData } from './hooks/useFinancialData';
import { 
  LayoutDashboard, 
  Receipt, 
  CalendarClock, 
  Wallet, 
  Target, 
  PieChart, 
  MessageSquare, 
  LogOut, 
  Menu,
  Plus,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PiggyBank,
  Sparkles
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import Dashboard from './components/Dashboard';
import ExpensesView from './components/ExpensesView';
import DuesView from './components/DuesView';
import SalariesView from './components/SalariesView';
import BudgetsView from './components/BudgetsView';
import CalendarView from './components/CalendarView';
import AIInsights from './components/AIInsights';
import FloatingChat from './components/FloatingChat';
import SavingsView from './components/SavingsView';
import LandingPage from './components/LandingPage';
import { Logo } from './components/Logo';
import { Toaster } from 'sonner';
import { MonthFilter } from './components/MonthFilter';
import { getMonthSuggestions } from './lib/utils/monthUtils';
import { FinancialPeriodProvider, useFinancialPeriod } from './contexts/FinancialPeriodContext';
import { TooltipProvider } from './components/ui/tooltip';

import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import { CURRENCIES } from './types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './components/ui/select';

function AppContent() {
  const { user, userProfile, loading, isConnected, signIn, logout } = useAuth();
  const { preferredCurrency, setPreferredCurrency } = useCurrency();
  const { selectedMonth, setSelectedMonth } = useFinancialPeriod();
  const financialData = useFinancialData();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-900 border-t-transparent"></div>
          <p className="text-zinc-600 font-medium">Loading SpendWise AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'dues', label: 'Bills & Dues', icon: CalendarClock },
    { id: 'salaries', label: 'Income', icon: Wallet },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  ];

  const monthSuggestions = getMonthSuggestions(financialData);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard data={financialData} setActiveTab={setActiveTab} />;
      case 'expenses': return <ExpensesView data={financialData} />;
      case 'dues': return <DuesView data={financialData} />;
      case 'salaries': return <SalariesView data={financialData} />;
      case 'savings': return <SavingsView data={financialData} />;
      case 'budgets': return <BudgetsView data={financialData} />;
      case 'insights': return <AIInsights data={financialData} />;
      case 'calendar': return <CalendarView data={financialData} />;
      default: return <Dashboard data={financialData} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden font-sans">
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-rose-600 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Firebase Connection Error: Please check your Project ID and ensure Firestore is enabled in your console.</span>
          </div>
        </div>
      )}
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-zinc-100">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight text-zinc-900 line-clamp-1">SpendWise AI</span>
        </div>
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 translate-x-1' 
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <item.icon className={`h-4 w-4 ${activeTab === item.id ? 'text-white' : 'text-zinc-400'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>
        <div className="border-t border-zinc-100 p-4 bg-zinc-50/50">
          <div className="flex items-center gap-3 px-2 py-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold text-sm">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-zinc-900">{userProfile?.displayName || 'User'}</p>
              <p className="truncate text-xs text-zinc-500">{userProfile?.email}</p>
            </div>
          </div>
          <div className="px-2 mb-4">
            <Select value={preferredCurrency.code} onValueChange={setPreferredCurrency}>
              <SelectTrigger className="w-full h-9 text-xs border-zinc-200">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-500 hover:text-red-600 hover:bg-red-50" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger 
                className="lg:hidden"
                render={
                  <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
                    <Menu className="h-6 w-6" />
                  </button>
                } 
              />
              <SheetContent side="left" className="w-64 p-0 flex flex-col">
                <div className="flex h-16 items-center gap-2 px-6 border-b">
                  <Logo className="h-8 w-8" />
                  <span className="text-xl font-bold">SpendWise AI</span>
                </div>
                <ScrollArea className="flex-1">
                  <nav className="space-y-1 p-4">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          activeTab === item.id 
                            ? 'bg-zinc-900 text-white shadow-md' 
                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </ScrollArea>
                <div className="border-t border-zinc-200 p-4 space-y-4">
                  <Select value={preferredCurrency.code} onValueChange={setPreferredCurrency}>
                    <SelectTrigger className="w-full h-9 text-xs border-zinc-200">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.symbol} {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-500 hover:text-red-600" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="text-lg font-bold">SpendWise AI</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
                  {navItems.find(i => i.id === activeTab)?.label}
                </h2>
                <p className="text-zinc-500">
                  {activeTab === 'dashboard' ? `Welcome back, ${userProfile?.displayName || 'User'}` : `Manage your ${activeTab}`}
                </p>
              </div>
            </div>

            {activeTab !== 'calendar' && activeTab !== 'insights' && (
              <MonthFilter 
                selectedMonth={selectedMonth} 
                onMonthChange={setSelectedMonth} 
                suggestions={monthSuggestions} 
              />
            )}
            
            {renderContent()}
          </div>
        </main>
      </div>
      <FloatingChat data={financialData} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <FinancialPeriodProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </FinancialPeriodProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
