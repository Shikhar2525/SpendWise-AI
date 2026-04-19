import * as React from 'react';
import { CURRENCIES, Currency } from '../types';
import { useAuth } from './AuthContext';
import { db, doc, updateDoc, onSnapshot } from '../lib/firebase';

interface CurrencyContextType {
  preferredCurrency: Currency;
  setPreferredCurrency: (code: string) => Promise<void>;
  convert: (amount: number, from: string, to: string) => number;
  formatAmount: (amount: number, code?: string) => string;
  liveRates: Record<string, number>;
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined);

const RATES_CACHE_KEY = 'spendwise_currency_rates';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferredCode, setPreferredCode] = React.useState('USD');
  const [liveRates, setLiveRates] = React.useState<Record<string, number>>({});

  // Fetch live rates
  React.useEffect(() => {
    const fetchRates = async () => {
      try {
        // Try to load from cache first
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) {
          const { rates, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setLiveRates(rates);
            return;
          }
        }

        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        
        if (data && data.rates) {
          setLiveRates(data.rates);
          localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({
            rates: data.rates,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Error fetching currency rates:', error);
        // Fallback is handled by using static rates if liveRates is empty
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

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
    if (from === to) return amount;
    
    // Get rates (prefer live, fallback to static)
    const getRate = (code: string) => {
      if (liveRates[code]) return liveRates[code];
      const staticCurr = CURRENCIES.find(c => c.code === code);
      return staticCurr ? staticCurr.rate : 1;
    };

    const fromRate = getRate(from);
    const toRate = getRate(to);
    
    // Convert to USD first (base), then to target
    const inUSD = amount / fromRate;
    return inUSD * toRate;
  };

  const formatAmount = (amount: number, code?: string) => {
    const targetCode = code || preferredCode;
    const currency = CURRENCIES.find(c => c.code === targetCode) || preferredCurrency;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCode,
      currencyDisplay: 'symbol'
    }).format(amount);
  };

  return (
    <CurrencyContext.Provider value={{ preferredCurrency, setPreferredCurrency, convert, formatAmount, liveRates }}>
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
