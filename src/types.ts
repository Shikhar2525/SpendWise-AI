export type PlanType = 'Essential' | 'Intelligent' | 'Architect';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  preferredCurrency: string;
  hasSeenTutorial: boolean;
  plan: PlanType;
  planExpiresAt?: string | null;
}

export interface Expense {
  id: string;
  uid: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  description: string;
  createdAt: string;
}

export interface Due {
  id: string;
  uid: string;
  amount: number;
  currency: string;
  dueDate: string;
  category: string;
  description: string;
  isRecurring: boolean;
  repeatUntil?: string;
  isPaid: boolean;
  settledExpenseId?: string | null;
  createdAt: string;
}

export interface Salary {
  id: string;
  uid: string;
  amount: number;
  currency: string;
  date: string;
  isRecurring: boolean;
  repeatUntil?: string;
  description: string;
  createdAt: string;
}

export interface Saving {
  id: string;
  uid: string;
  amount: number;
  currency: string;
  type: 'RD' | 'FD' | 'Mutual Fund' | 'Stocks' | 'Crypto' | 'Gold' | 'Provident Fund' | 'Other';
  description: string;
  isRecurring: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  uid: string;
  category: string;
  limit: number;
  currency: string;
  month: string; // YYYY-MM
  isRecurring?: boolean;
}

export interface Goal {
  id: string;
  uid: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string;
  createdAt: string;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate relative to USD (base)
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.94 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.80 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 154.50 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.50 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.55 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.38 },
];

export type Category = 
  | 'Housing' 
  | 'Food' 
  | 'Transport' 
  | 'Entertainment' 
  | 'Utilities' 
  | 'Health' 
  | 'Shopping' 
  | 'Education'
  | 'Travel'
  | 'Insurance'
  | 'Gifts'
  | 'Investment'
  | 'Subscriptions'
  | 'Personal Care'
  | 'Pets'
  | 'Maintenance'
  | 'Taxes'
  | 'Charity'
  | 'Debt'
  | 'Work'
  | 'Electronics'
  | 'Home Decor'
  | 'Groceries'
  | 'Dining Out'
  | 'Fitness'
  | 'Beauty'
  | 'Books'
  | 'Clothing'
  | 'Fuel'
  | 'Public Transit'
  | 'Coffee Shops'
  | 'Streaming Services'
  | 'Gym'
  | 'Pharmacy'
  | 'Office Supplies'
  | 'Hobbies'
  | 'Rent'
  | 'Mortgage'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Housing',
  'Food',
  'Transport',
  'Entertainment',
  'Utilities',
  'Health',
  'Shopping',
  'Education',
  'Travel',
  'Insurance',
  'Gifts',
  'Investment',
  'Subscriptions',
  'Personal Care',
  'Pets',
  'Maintenance',
  'Taxes',
  'Charity',
  'Debt',
  'Work',
  'Electronics',
  'Home Decor',
  'Groceries',
  'Dining Out',
  'Fitness',
  'Beauty',
  'Books',
  'Clothing',
  'Fuel',
  'Public Transit',
  'Coffee Shops',
  'Streaming Services',
  'Gym',
  'Pharmacy',
  'Office Supplies',
  'Hobbies',
  'Rent',
  'Mortgage',
  'Other'
];
