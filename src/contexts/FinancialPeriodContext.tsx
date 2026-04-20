import * as React from 'react';
import { format } from 'date-fns';

interface FinancialPeriodContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

const FinancialPeriodContext = React.createContext<FinancialPeriodContextType | undefined>(undefined);

export function FinancialPeriodProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = React.useState(() => {
    const saved = localStorage.getItem('spendwise_selected_month');
    return saved || format(new Date(), 'yyyy-MM');
  });

  const setSelectedMonth = React.useCallback((month: string) => {
    setSelectedMonthState(month);
    localStorage.setItem('spendwise_selected_month', month);
  }, []);

  const contextValue = React.useMemo(() => ({ 
    selectedMonth, 
    setSelectedMonth 
  }), [selectedMonth, setSelectedMonth]);

  return (
    <FinancialPeriodContext.Provider value={contextValue}>
      {children}
    </FinancialPeriodContext.Provider>
  );
}

export function useFinancialPeriod() {
  const context = React.useContext(FinancialPeriodContext);
  if (context === undefined) {
    throw new Error('useFinancialPeriod must be used within a FinancialPeriodProvider');
  }
  return context;
}
