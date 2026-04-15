import * as React from 'react';
import { db, collection, query, where, onSnapshot, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Expense, Due, Salary, Budget, Goal, Saving } from '../types';

export function useFinancialData() {
  const { user } = useAuth();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [dues, setDues] = React.useState<Due[]>([]);
  const [salaries, setSalaries] = React.useState<Salary[]>([]);
  const [savings, setSavings] = React.useState<Saving[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setExpenses([]);
      setDues([]);
      setSalaries([]);
      setSavings([]);
      setBudgets([]);
      setGoals([]);
      setLoading(false);
      return;
    }

    const qExpenses = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const qDues = query(collection(db, 'dues'), where('uid', '==', user.uid));
    const qSalaries = query(collection(db, 'salaries'), where('uid', '==', user.uid));
    const qSavings = query(collection(db, 'savings'), where('uid', '==', user.uid));
    const qBudgets = query(collection(db, 'budgets'), where('uid', '==', user.uid));
    const qGoals = query(collection(db, 'goals'), where('uid', '==', user.uid));

    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'expenses'));

    const unsubDues = onSnapshot(qDues, (snapshot) => {
      setDues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Due)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'dues'));

    const unsubSalaries = onSnapshot(qSalaries, (snapshot) => {
      setSalaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salary)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'salaries'));

    const unsubSavings = onSnapshot(qSavings, (snapshot) => {
      setSavings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Saving)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'savings'));

    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'goals'));

    return () => {
      unsubExpenses();
      unsubDues();
      unsubSalaries();
      unsubSavings();
      unsubBudgets();
      unsubGoals();
    };
  }, [user]);

  return { expenses, dues, salaries, savings, budgets, goals, loading };
}
