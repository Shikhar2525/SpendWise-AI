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
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';

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
    { id: 'salaries', label: 'Income', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'dues', label: 'Bills', icon: CalendarClock },
    { id: 'savings', label: 'Savings & Goals', icon: PiggyBank },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'insights', label: 'AI Intelligence', icon: Sparkles },
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
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans transition-colors duration-500">
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-rose-600 text-white px-4 py-2 text-center text-sm font-bold shadow-xl animate-in slide-in-from-top duration-500">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Infrastructure Sync Error: Check Firebase configuration and Firestore permissions.</span>
          </div>
        </div>
      )}
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 lg:flex transition-colors">
        <div className="flex h-20 items-center justify-center gap-3 px-6 border-b border-zinc-100 dark:border-zinc-800">
          <Logo className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter uppercase italic text-zinc-900 dark:text-white leading-none">SpendWise <span className="text-indigo-600 dark:text-indigo-400">AI</span></span>
            <Badge className="w-fit h-4 px-1.5 py-0 text-[8px] font-black uppercase tracking-[0.2em] bg-indigo-600 text-white border-none rounded-md scale-[0.8] origin-left mt-0.5">
              Intelligent
            </Badge>
          </div>
        </div>
        <ScrollArea className="flex-1 px-4 py-6">
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold uppercase tracking-tight transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-2xl shadow-zinc-200 dark:shadow-none translate-x-1' 
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 transition-transform group-hover:scale-110 ${activeTab === item.id ? (item.id === 'insights' ? 'text-indigo-400 dark:text-indigo-600' : 'text-current') : 'text-zinc-400 flex-shrink-0'}`} />
                <span className="text-[11px] tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </ScrollArea>
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex items-center gap-3 px-2 py-2 mb-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm flex items-center justify-center overflow-hidden">
              {userProfile?.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName} 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">{userProfile?.displayName || 'Active User'}</p>
              <p className="truncate text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{userProfile?.email}</p>
            </div>
          </div>
          <div className="px-1 mb-4 flex items-center justify-between gap-2">
            <Select value={preferredCurrency.code} onValueChange={setPreferredCurrency}>
              <SelectTrigger className="flex-1 h-9 text-[9px] font-black uppercase tracking-widest border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-xl">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code} className="text-[9px] font-bold uppercase tracking-widest">
                    {c.symbol} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ThemeToggle />
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold uppercase text-[9px] tracking-widest h-9 rounded-xl transition-all" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" />
            Logout Account
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-20 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 lg:hidden transition-colors">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger 
                render={
                  <button className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                    <Menu className="h-7 w-7" />
                  </button>
                }
              />
              <SheetContent side="left" className="w-72 h-full p-0 flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
                <div className="flex h-20 items-center justify-center gap-3 px-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                  <Logo className="h-8 w-8" />
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tighter uppercase italic dark:text-white leading-none">SpendWise <span className="text-indigo-600 dark:text-indigo-400">AI</span></span>
                    <Badge className="w-fit h-4 px-1.5 py-0 text-[8px] font-black uppercase tracking-[0.2em] bg-indigo-600 text-white border-none rounded-md scale-[0.8] origin-left mt-0.5">
                      Intelligent
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <nav className="space-y-2 p-6">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-tight transition-all ${
                          activeTab === item.id 
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-2xl' 
                            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[11px] tracking-widest">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </ScrollArea>
                <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <Select value={preferredCurrency.code} onValueChange={setPreferredCurrency}>
                      <SelectTrigger className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl shadow-sm">
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code} className="text-[9px] font-bold uppercase tracking-widest">
                            {c.symbol} {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ThemeToggle />
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold uppercase text-[9px] tracking-widest h-10 rounded-xl transition-all" 
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout Account
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
                {userProfile?.photoURL ? (
                  <img 
                    src={userProfile.photoURL} 
                    alt={userProfile.displayName} 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Logo className="h-full w-full p-1" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tighter uppercase italic dark:text-white leading-none">SpendWise</span>
                <Badge className="w-fit h-3.5 px-1.5 py-0 text-[7px] font-black uppercase tracking-[0.2em] bg-indigo-600 text-white border-none rounded-md scale-[0.8] origin-left mt-0.5">
                  Intelligent
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-10 bg-white dark:bg-zinc-950 transition-colors">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   {userProfile?.photoURL && (
                     <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-zinc-100 dark:border-zinc-800">
                        <img 
                          src={userProfile.photoURL} 
                          alt="Avatar" 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                     </div>
                   )}
                   <h2 className="text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase leading-none">
                     {navItems.find(i => i.id === activeTab)?.label}
                   </h2>
                </div>
                <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  {activeTab === 'dashboard' ? `Welcome back, ${userProfile?.displayName || 'User'}` : `Managing your ${activeTab}`}
                </p>
              </div>
              
              {activeTab !== 'calendar' && activeTab !== 'insights' && (
                <MonthFilter 
                  selectedMonth={selectedMonth} 
                  onMonthChange={setSelectedMonth} 
                  suggestions={monthSuggestions} 
                />
              )}
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
      <FloatingChat data={financialData} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
