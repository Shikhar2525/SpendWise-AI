import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Due, Expense } from '../types';
import { notifyUpcomingReminder } from '../lib/notifications';
import { parseISO, differenceInDays } from 'date-fns';
import { expandRecurringItems } from '../lib/utils/recurringUtils';

interface NotificationManagerProps {
  data: {
    dues: Due[];
    expenses: Expense[];
  };
}

export default function NotificationManager({ data }: NotificationManagerProps) {
  const { user } = useAuth();
  const { dues } = data;
  const processedToday = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !user.email || dues.length === 0) return;

    // Check once per session/day
    const todayStr = new Date().toISOString().split('T')[0];
    if (processedToday.current === todayStr) return;

    const checkReminders = async () => {
      // Expand recurring dues for the current month
      const targetDate = new Date();
      const expandedDues = expandRecurringItems(dues, targetDate);
      
      // Filter for upcoming dues in next 2 days that are not paid
      const upcoming = expandedDues.filter(d => {
        const dueDate = parseISO(d.dueDate!);
        const diff = differenceInDays(dueDate, new Date());
        return diff >= 0 && diff <= 2 && !d.isPaid;
      });

      if (upcoming.length > 0) {
        // Just notify about the most immediate one to avoid spam
        const mostImmediate = upcoming[0];
        
        // Check local storage to avoid repeated emails for the same due on the same day
        const storageKey = `sent_reminder_${user.uid}_${mostImmediate.id}_${mostImmediate.dueDate}`;
        const alreadySent = localStorage.getItem(storageKey);

        if (!alreadySent) {
          await notifyUpcomingReminder(
            user.email!, 
            mostImmediate.description, 
            mostImmediate.amount, 
            mostImmediate.currency, 
            mostImmediate.dueDate
          );
          localStorage.setItem(storageKey, todayStr);
          console.log('Reminder email sent for:', mostImmediate.description);
        }
      }

      processedToday.current = todayStr;
    };

    checkReminders();
  }, [user, dues]);

  return null; // Invisible component
}
