import { format, parseISO } from 'date-fns';
import { Expense, Due, Salary, Saving } from '../../types';

export function getMonthSuggestions(data: {
  expenses?: Expense[];
  dues?: Due[];
  salaries?: Salary[];
  savings?: Saving[];
}) {
  const monthsWithData = new Set<string>();
  
  data.expenses?.forEach(e => monthsWithData.add(format(parseISO(e.date), 'yyyy-MM')));
  data.salaries?.forEach(s => monthsWithData.add(format(parseISO(s.date), 'yyyy-MM')));
  data.dues?.forEach(d => monthsWithData.add(format(parseISO(d.dueDate), 'yyyy-MM')));
  
  // Always include current month
  const currentM = format(new Date(), 'yyyy-MM');
  monthsWithData.add(currentM);
  
  return Array.from(monthsWithData).sort();
}
