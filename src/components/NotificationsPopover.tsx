import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CalendarClock, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2,
  CheckCircle,
  Dot
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useFinancialData } from '../hooks/useFinancialData';
import { format, isAfter, isBefore, addDays, startOfDay, parseISO, differenceInDays } from 'date-fns';
import { useCurrency } from '../contexts/CurrencyContext';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  type: 'due' | 'budget' | 'goal';
  title: string;
  message: string;
  date: Date;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
}

interface ReadState {
  [id: string]: { readAt: number };
}

export function NotificationsPopover() {
  const navigate = useNavigate();
  const financialData = useFinancialData();
  const { formatAmount } = useCurrency();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [readState, setReadState] = React.useState<ReadState>(() => {
    const saved = localStorage.getItem('spendwise_notifications_read');
    return saved ? JSON.parse(saved) : {};
  });

  // Save read state to localStorage
  React.useEffect(() => {
    localStorage.setItem('spendwise_notifications_read', JSON.stringify(readState));
  }, [readState]);

  React.useEffect(() => {
    if (financialData.loading) return;

    const newNotifications: Notification[] = [];
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    // 1. Check for Dues (Upcoming & Overdue)
    financialData.dues.forEach(due => {
      if (due.isPaid) return;
      
      const dueDate = parseISO(due.dueDate);
      const isOverdue = isBefore(dueDate, today);
      const isUpcoming = isAfter(dueDate, today) && isBefore(dueDate, nextWeek);

      let id = '';
      let title = '';
      let message = '';
      let severity: 'low' | 'medium' | 'high' = 'high';

      if (isOverdue) {
        id = `due-overdue-${due.id}`;
        title = 'Friendly nudge';
        message = `Oops! ${due.description} was due on ${format(dueDate, 'MMM d')}. Ready to clear this ${formatAmount(due.amount, due.currency)}?`;
        severity = 'high';
      } else if (isUpcoming) {
        id = `due-upcoming-${due.id}`;
        title = 'Time to prep';
        message = `Just a heads up, your ${due.description} is coming up on ${format(dueDate, 'MMM d')}.`;
        severity = 'medium';
      } else if (format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        id = `due-today-${due.id}`;
        title = 'Action needed today';
        message = `Heads up! ${due.description} is due today. Let's get that ${formatAmount(due.amount, due.currency)} settled!`;
        severity = 'high';
      }

      if (id) {
        newNotifications.push({ id, type: 'due', title, message, date: dueDate, severity, isRead: !!readState[id] });
      }
    });

    // 2. Check for Budgets
    const currentMonth = format(new Date(), 'yyyy-MM');
    financialData.budgets
      .filter(b => b.month === currentMonth)
      .forEach(budget => {
        const categoryExpenses = financialData.expenses
          .filter(e => e.category === budget.category && e.date.startsWith(currentMonth) && e.currency === budget.currency)
          .reduce((sum, e) => sum + e.amount, 0);

        const usageRatio = categoryExpenses / budget.limit;
        let id = '';
        let title = '';
        let message = '';
        let severity: 'low' | 'medium' | 'high' = 'medium';

        if (usageRatio >= 1) {
          id = `budget-exceeded-${budget.id}-${currentMonth}`;
          title = 'Budget Alert';
          message = `You've sailed past your ${budget.category} budget! Maybe time to slow down?`;
          severity = 'high';
        } else if (usageRatio >= 0.9) {
          id = `budget-warning-${budget.id}-${currentMonth}`;
          title = 'Watch your spending';
          message = `You've used ${Math.round(usageRatio * 100)}% of your ${budget.category} budget. Almost at the limit!`;
          severity = 'medium';
        }

        if (id) {
          newNotifications.push({ id, type: 'budget', title, message, date: new Date(), severity, isRead: !!readState[id] });
        }
      });

    // 3. Check for Goals
    financialData.goals.forEach(goal => {
      const progress = goal.currentAmount / goal.targetAmount;
      let id = '';
      let title = '';
      let message = '';
      
      if (progress >= 1) {
        id = `goal-complete-${goal.id}`;
        title = 'High five!';
        message = `Incredible! You hit your goal for "${goal.name}". What's next?`;
      } else if (progress >= 0.75) {
        id = `goal-progress-${goal.id}`;
        title = 'So close!';
        message = `You're ${Math.round(progress * 100)}% of the way to "${goal.name}". Keep that momentum!`;
      }

      if (id) {
        newNotifications.push({ id, type: 'goal', title, message, date: new Date(), severity: 'low', isRead: !!readState[id] });
      }
    });

    // Filter out read notifications older than 7 days
    const now = Date.now();
    const finalNotifications = newNotifications.filter(n => {
      if (!n.isRead) return true;
      const readAt = readState[n.id]?.readAt;
      if (!readAt) return true; // Should not happen
      return differenceInDays(now, readAt) < 7;
    });

    // Sort: Unread first, then severity, then date
    finalNotifications.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (a.severity !== 'high' && b.severity === 'high') return 1;
      return b.date.getTime() - a.date.getTime();
    });

    setNotifications(finalNotifications);
  }, [financialData.loading, financialData.dues, financialData.budgets, financialData.expenses, financialData.goals, formatAmount, readState]);

  const markAsRead = (id: string) => {
    setReadState(prev => ({ ...prev, [id]: { readAt: Date.now() } }));
  };

  const markAllAsRead = () => {
    const now = Date.now();
    const newReadState = { ...readState };
    notifications.forEach(n => {
      if (!n.isRead) {
        newReadState[n.id] = { readAt: now };
      }
    });
    setReadState(newReadState);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-10 w-10 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800"
        />
      }>
        <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-lg ring-2 ring-white dark:ring-zinc-950"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-black uppercase tracking-widest">Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20">
              {unreadCount} New Alerts
            </Badge>
          )}
        </div>
        
        <ScrollArea className="h-[450px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-zinc-300" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">All Clear</p>
              <p className="text-[10px] text-zinc-500 mt-1">No pending actions or alerts found in your financial data.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-5 group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40 relative cursor-default ${
                    notification.isRead ? 'opacity-60' : ''
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  {!notification.isRead && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-full" />
                  )}
                  <div className="flex gap-4">
                    <div className={`mt-1 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                      notification.severity === 'high' 
                        ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600' 
                        : notification.severity === 'medium'
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                        : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'
                    }`}>
                      {notification.type === 'due' ? (
                        <CalendarClock className="h-4 w-4" />
                      ) : notification.type === 'budget' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <TrendingUp className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] font-black uppercase tracking-tight ${
                          notification.severity === 'high' ? 'text-rose-600' : 'text-zinc-900 dark:text-white'
                        }`}>
                          {notification.title}
                        </p>
                        <span className="text-[9px] font-medium text-zinc-400 whitespace-nowrap">
                          {format(notification.date, 'MMM d')}
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <button 
                          className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
                          onClick={() => {
                            setIsOpen(false);
                            if (notification.type === 'due') navigate('/dues');
                            if (notification.type === 'budget') navigate('/budgets');
                            if (notification.type === 'goal') navigate('/savings');
                          }}
                        >
                          View Details
                        </button>
                        {!notification.isRead && (
                          <>
                            <Dot className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />
                            <button 
                              className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
          <Button 
            variant="ghost" 
            className="w-full h-8 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark All as Read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
