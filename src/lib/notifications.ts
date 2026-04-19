import { Expense } from '../types';

type NotificationTemplate = 'welcome' | 'transaction' | 'reminder';

interface NotificationData {
  to: string;
  subject: string;
  templateName: NotificationTemplate;
  data: Record<string, any>;
}

export async function sendNotification({ to, subject, templateName, data }: NotificationData) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, templateName, data }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notification API Error Response:', errorText);
      throw new Error(`Failed to send notification: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but received:', text);
      throw new Error('Received non-JSON response from notification server');
    }

    return await response.json();
  } catch (error) {
    console.error('Notification error:', error);
    // Silent fail for now so it doesn't break user flow
    return { success: false, error: 'Service Unavailable' };
  }
}

export const notifyWelcome = (email: string, name: string) => {
  return sendNotification({
    to: email,
    subject: 'Welcome to SpendWise AI 🚀',
    templateName: 'welcome',
    data: { name },
  });
};

export const notifyTransaction = (email: string, expense: Partial<Expense>) => {
  return sendNotification({
    to: email,
    subject: `SpendWise: New ${expense.category} Entry Record!`,
    templateName: 'transaction',
    data: {
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
      description: expense.description,
    },
  });
};

export const notifyUpcomingReminder = (email: string, description: string, amount: number, currency: string, date: string) => {
  return sendNotification({
    to: email,
    subject: '⚠️ Spending Alert: Upcoming Bill',
    templateName: 'reminder',
    data: { description, amount, currency, date },
  });
};
