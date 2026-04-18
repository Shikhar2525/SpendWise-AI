import { isSameMonth, parseISO, startOfMonth, addMonths, isBefore, isAfter, format, setDate } from 'date-fns';

/**
 * Expands a list of items (Dues, Salaries, Savings) that might be recurring
 * to include their "virtual" instances for the target month.
 */
export function expandRecurringItems<T extends { 
  id: string;
  isRecurring: boolean; 
  repeatUntil?: string; 
  excludedDates?: string[];
  dueDate?: string; 
  date?: string; 
  startDate?: string;
  isPaid?: boolean;
}>(
  items: T[],
  targetMonth: Date
): T[] {
  const expanded: T[] = [];
  const targetStart = startOfMonth(targetMonth);
  
  items.forEach(item => {
    const itemDateStr = item.dueDate || item.date || item.startDate;
    if (!itemDateStr) return;
    
    const originalDate = parseISO(itemDateStr);
    const itemStart = startOfMonth(originalDate);
    
    if (!item.isRecurring) {
      if (isSameMonth(originalDate, targetMonth)) {
        expanded.push(item);
      }
      return;
    }
    
    // Recurring logic:
    // 1. Started in or before target month
    const hasStarted = !isAfter(itemStart, targetStart);
    
    // 2. Has not reached repeatUntil (if set)
    let isActive = true;
    if (item.repeatUntil) {
      const untilDate = parseISO(item.repeatUntil);
      isActive = !isAfter(targetStart, startOfMonth(untilDate));
    }
    
    if (hasStarted && isActive) {
      // Virtualize the date for the target month
      // Use original day of month, but clamp if month is shorter
      const lastDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      const originalDay = originalDate.getDate();
      const virtualDay = Math.min(originalDay, lastDayOfMonth);
      
      const virtualDate = setDate(targetStart, virtualDay);
      const virtualDateStr = format(virtualDate, 'yyyy-MM-dd');

      // Check for excluded dates
      if (item.excludedDates?.includes(virtualDateStr)) {
        return;
      }

      // Special handling for Dues 'isPaid' status:
      // If it's a recurring due, we need to handle the fact that the 'isPaid' flag in DB
      // might be for a different month.
      // For now, we expand it. In DuesView, we will need to handle the toggle better.
      
      expanded.push({
        ...item,
        ...(item.dueDate ? { dueDate: virtualDateStr } : 
           item.date ? { date: virtualDateStr } : 
           item.startDate ? { startDate: virtualDateStr } : {})
      });
    }
  });
  
  return expanded;
}
