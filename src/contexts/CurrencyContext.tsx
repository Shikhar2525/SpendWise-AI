import * as React from 'react';
import { CURRENCIES, Currency } from '../types';
import { useAuth } from './AuthContext';
import { db, doc, updateDoc, onSnapshot } from '../lib/firebase';

interface CurrencyContextType {
  preferredCurrency: Currency;
  setPreferredCurrency: (code: string) => Promise<void>;
  convert: (amount: number, from: string, to: string) => number;
  formatAmount: (amount: number, code?: string) => string;
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferredCode, setPreferredCode] = React.useState('USD');

  React.useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.preferredCurrency) {
          setPreferredCode(data.preferredCurrency);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const preferredCurrency = CURRENCIES.find(c => c.code === preferredCode) || CURRENCIES[0];

  const setPreferredCurrency = async (code: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferredCurrency: code
      });
      setPreferredCode(code);
    } catch (error) {
      console.error('Error updating preferred currency:', error);
    }
  };

  const convert = (amount: number, from: string, to: string) => {
    const fromCurrency = CURRENCIES.find(c => c.code === from) || CURRENCIES[0];
    const toCurrency = CURRENCIES.find(c => c.code === to) || CURRENCIES[0];
    
    // Convert to USD first (base), then to target
    const inUSD = amount / fromCurrency.rate;
    return inUSD * toCurrency.rate;
  };

  const formatAmount = (amount: number, code?: string) => {
    const currency = CURRENCIES.find(c => c.code === (code || preferredCode)) || preferredCurrency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'symbol'
    }).format(amount);
  };

  return (
    <CurrencyContext.Provider value={{ preferredCurrency, setPreferredCurrency, convert, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = React.useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
