import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, Transaction } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

const CATEGORIES = [
  'Food',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Insurance',
  'Other',
];

const PAYMENT_METHODS = Array.from({ length: 12 }, (_, i) => `Method ${i + 1}`);

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function Dashboard() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');

  // Dialog states
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [fyDialogOpen, setFyDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quickAddForm, setQuickAddForm] = useState<{
    type: 'income' | 'expense';
    amount: string;
    description: string;
    category: string;
    payment_method: string;
  }>({
    type: 'expense',
    amount: '',
    description: '',
    category: '',
    payment_method: '',
  });

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    category: '',
    payment_method: '',
  });
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    description: '',
  });
  const [editForm, setEditForm] = useState<{
    amount: string;
    description: string;
    type: 'income' | 'expense';
    category: string;
    payment_method: string;
  }>({
    amount: '',
    description: '',
    type: 'expense',
    category: '',
    payment_method: '',
  });

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await api.getTransactions();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = transactions
    .filter((t) => {
      const date = new Date(t.date);
      const matchesDate = viewMode === 'daily'
        ? date.getDate() === selectedDay &&
        date.getMonth() + 1 === selectedMonth &&
        date.getFullYear() === selectedYear
        : date.getMonth() + 1 === selectedMonth &&
        date.getFullYear() === selectedYear;
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchesPaymentMethod = filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod;

      return matchesDate && matchesSearch && matchesCategory && matchesPaymentMethod;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'highest':
          return b.amount - a.amount;
        case 'lowest':
          return a.amount - b.amount;
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'newest':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);


  // Category data for chart
  const expensesByCategory = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'Other';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [
      {
        data: Object.values(expensesByCategory),
        backgroundColor: [
          '#008080',
          '#FF8C00',
          '#800080',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#C9CBCF',
          '#4BC0C0',
          '#FF6384',
        ],
        hoverOffset: 4,
      },
    ],
  };

  // Calculate Financial Year
  const getFYDateRange = (month: number, year: number) => {
    const startYear = month >= 4 ? year : year - 1;
    const startDate = new Date(startYear, 3, 1); // April 1st
    const endDate = new Date(startYear + 1, 2, 31); // March 31st next year
    return { startDate, endDate, startYear };
  };

  const { startDate: fyStartDate, startYear: fyStartYear } = getFYDateRange(selectedMonth, selectedYear);

  const totalFYExpenses = transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return t.type === 'expense' && tDate >= fyStartDate && tDate <= new Date();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const carryForwardBalance = transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      // Filter transactions before the selected month/year
      const currentMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
      return tDate < currentMonthStart;
    })
    .reduce((acc, t) => {
      return acc + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

  const balance = carryForwardBalance + totalIncome - totalExpenses;

  // FY transactions and metrics
  const { endDate: fyEndDate } = getFYDateRange(selectedMonth, selectedYear);
  const fyTransactions = transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= fyStartDate && tDate <= fyEndDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const fyTotalIncome = fyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const fyTotalExpenses = fyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Day navigation helpers
  const handlePreviousDay = () => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDay(currentDate.getDate());
    setSelectedMonth(currentDate.getMonth() + 1);
    setSelectedYear(currentDate.getFullYear());
  };

  const handleNextDay = () => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDay(currentDate.getDate());
    setSelectedMonth(currentDate.getMonth() + 1);
    setSelectedYear(currentDate.getFullYear());
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate amount
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    // Validate description
    if (!expenseForm.description.trim()) {
      setError('Description is required');
      return;
    }

    // Validate category
    if (!expenseForm.category) {
      setError('Category is required');
      return;
    }

    try {
      const transactionDate = viewMode === 'daily'
        ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
        : new Date().toISOString();

      console.log('Adding expense - View Mode:', viewMode, 'Date:', transactionDate, 'Selected:', { selectedYear, selectedMonth, selectedDay });

      await api.createTransaction({
        type: 'expense',
        amount,
        description: expenseForm.description.trim(),
        category: expenseForm.category,
        payment_method: expenseForm.payment_method || null,
        date: transactionDate,
      });
      setExpenseForm({ amount: '', description: '', category: '', payment_method: '' });
      setExpenseDialogOpen(false);
      setError('');
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate amount
    const amount = parseFloat(incomeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    // Validate description
    if (!incomeForm.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      const transactionDate = viewMode === 'daily'
        ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
        : new Date().toISOString();

      console.log('Adding income - View Mode:', viewMode, 'Date:', transactionDate, 'Selected:', { selectedYear, selectedMonth, selectedDay });

      await api.createTransaction({
        type: 'income',
        amount,
        description: incomeForm.description.trim(),
        category: null,
        payment_method: null,
        date: transactionDate,
      });
      setIncomeForm({ amount: '', description: '' });
      setIncomeDialogOpen(false);
      setError('');
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add income');
    }
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      description: transaction.description,
      type: transaction.type,
      category: transaction.category || '',
      payment_method: transaction.payment_method || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !editingTransaction.id) return;

    // Validate amount
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    // Validate description
    if (!editForm.description.trim()) {
      setError('Description is required');
      return;
    }

    // Validate category for expenses
    if (editForm.type === 'expense' && !editForm.category.trim()) {
      setError('Category is required for expenses');
      return;
    }

    try {
      await api.updateTransaction(editingTransaction.id, {
        type: editForm.type,
        amount,
        description: editForm.description.trim(),
        category: editForm.category || null,
        payment_method: editForm.payment_method || null,
      });
      setEditDialogOpen(false);
      setEditingTransaction(null);
      setError('');
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDialogConfig({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      onConfirm: async () => {
        try {
          await api.deleteTransaction(id);
          fetchTransactions();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete transaction');
        }
      },
    });
    setConfirmDialogOpen(true);
  };

  // Calendar helpers
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setQuickAddForm({
      type: 'expense',
      amount: '',
      description: '',
      category: '',
      payment_method: '',
    });
    setQuickAddDialogOpen(true);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    const amount = parseFloat(quickAddForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      await api.createTransaction({
        type: quickAddForm.type,
        amount,
        description: quickAddForm.description.trim() || `${quickAddForm.type} on ${selectedDate.toLocaleDateString()}`,
        category: quickAddForm.type === 'expense' ? quickAddForm.category || null : null,
        payment_method: quickAddForm.type === 'expense' ? quickAddForm.payment_method || null : null,
        date: selectedDate.toISOString().split('T')[0],
      });
      setQuickAddDialogOpen(false);
      setSelectedDate(null);
      setError('');
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  const years = Array.from(
    { length: new Date().getFullYear() - 2020 + 2 },
    (_, i) => new Date().getFullYear() - 1 + i
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-purple-500 to-orange-500">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {username || 'User'}
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => setCalendarDialogOpen(true)} variant="outline">
              📅 Calendar
            </Button>
            <Button
              onClick={() => setViewMode(viewMode === 'daily' ? 'monthly' : 'daily')}
              variant="outline"
            >
              {viewMode === 'daily' ? '📊 Monthly' : '📅 Daily'}
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {viewMode === 'monthly' ? (
                <>
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(v) => setSelectedMonth(parseInt(v))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, index) => (
                          <SelectItem key={index + 1} value={(index + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={handlePreviousDay}>
                        ←
                      </Button>
                      <div className="flex-1 text-center font-semibold">
                        {new Date(selectedYear, selectedMonth - 1, selectedDay).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNextDay}>
                        →
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Financial Year</Label>
                <Button
                  variant="outline"
                  className="w-full text-base px-4 py-2 h-10 border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => setFyDialogOpen(true)}
                >
                  FY {fyStartYear}-{fyStartYear + 1}
                  <span className="text-xs ml-2 opacity-75">
                    (Apr {fyStartYear} - Mar {fyStartYear + 1})
                  </span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-100 to-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-4xl">💰</span>
                Opening Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold ${carryForwardBalance >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                ₹{carryForwardBalance.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-100 to-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-4xl">↑</span>
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-700">
                ₹{totalIncome.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-100 to-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-4xl">↓</span>
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <p className="text-4xl font-bold text-red-700">
                  ₹{totalExpenses.toFixed(2)}
                </p>
                <p className="text-sm text-red-600/80 mt-2 font-medium">
                  FY Total: ₹{totalFYExpenses.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-100 to-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-4xl">=</span>
                Closing Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-4xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'
                  }`}
              >
                ₹{balance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Enter the details of your expense below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddExpense}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-amount">Amount</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount"
                      value={expenseForm.amount}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-category">Category</Label>
                    <Select
                      value={expenseForm.category}
                      onValueChange={(v) =>
                        setExpenseForm({ ...expenseForm, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-payment-method">Payment Method</Label>
                    <Select
                      value={expenseForm.payment_method}
                      onValueChange={(v) =>
                        setExpenseForm({ ...expenseForm, payment_method: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Description</Label>
                    <textarea
                      id="expense-description"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter description"
                      value={expenseForm.description}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          description: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">Add Expense</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-500 hover:bg-teal-600">
                Add Income
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Income</DialogTitle>
                <DialogDescription>
                  Enter the details of your income below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddIncome}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="income-amount">Amount</Label>
                    <Input
                      id="income-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount"
                      value={incomeForm.amount}
                      onChange={(e) =>
                        setIncomeForm({ ...incomeForm, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income-description">Description</Label>
                    <Input
                      id="income-description"
                      type="text"
                      placeholder="Enter description"
                      value={incomeForm.description}
                      onChange={(e) =>
                        setIncomeForm({
                          ...incomeForm,
                          description: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">Add Income</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>
                Breakdown of expenses by category for{' '}
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(expensesByCategory).length > 0 ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Doughnut
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expenses for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Recent transactions for {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="w-[180px]">
                  <Label>Sort By</Label>
                  <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Date (Newest)</SelectItem>
                      <SelectItem value="oldest">Date (Oldest)</SelectItem>
                      <SelectItem value="highest">Amount (High-Low)</SelectItem>
                      <SelectItem value="lowest">Amount (Low-High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[180px]">
                  <Label>Category</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[180px]">
                  <Label>Payment Method</Label>
                  <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id || transaction.date + transaction.description}>
                          <TableCell>
                            {new Date(transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {transaction.type === 'expense' ? (
                              <Badge variant="secondary">
                                {transaction.category || 'N/A'}
                              </Badge>
                            ) : (
                              <Badge variant="default">Income</Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${transaction.type === 'income'
                              ? 'text-green-600'
                              : 'text-red-600'
                              }`}
                          >
                            {transaction.type === 'income' ? '+' : '-'}₹
                            {transaction.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleEditClick(transaction)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  transaction.id ? handleDelete(transaction.id) : null
                                }
                                disabled={!transaction.id}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update the transaction details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, type: v as 'income' | 'expense' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editForm.amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    type="text"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    required
                  />
                </div>
                {editForm.type === 'expense' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Category</Label>
                      <Select
                        value={editForm.category}
                        onValueChange={(v) =>
                          setEditForm({ ...editForm, category: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-payment-method">Payment Method</Label>
                      <Select
                        value={editForm.payment_method}
                        onValueChange={(v) =>
                          setEditForm({ ...editForm, payment_method: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* FY Summary Dialog */}
        <Dialog open={fyDialogOpen} onOpenChange={setFyDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Financial Year Summary: FY {fyStartYear}-{fyStartYear + 1}</DialogTitle>
              <DialogDescription>
                Period: April 1, {fyStartYear} - March 31, {fyStartYear + 1}
              </DialogDescription>
            </DialogHeader>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
              <Card className="bg-gradient-to-br from-green-100 to-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-700">
                    ₹{fyTotalIncome.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-100 to-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-700">
                    ₹{fyTotalExpenses.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-100 to-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Opening Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${carryForwardBalance >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                    ₹{carryForwardBalance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">All Transactions ({fyTransactions.length})</h3>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fyTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No transactions in this financial year
                        </TableCell>
                      </TableRow>
                    ) : (
                      fyTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.category || '-'}</TableCell>
                          <TableCell>{transaction.payment_method || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{transaction.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Calendar Dialog */}
        <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Calendar View</DialogTitle>
              <DialogDescription>
                Click any date to add a transaction
              </DialogDescription>
            </DialogHeader>

            {/* Calendar Navigation */}
            <div className="flex justify-between items-center my-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (calendarMonth === 1) {
                    setCalendarMonth(12);
                    setCalendarYear(calendarYear - 1);
                  } else {
                    setCalendarMonth(calendarMonth - 1);
                  }
                }}
              >
                ← Previous
              </Button>
              <h3 className="text-xl font-semibold">
                {MONTHS[calendarMonth - 1]} {calendarYear}
              </h3>
              <Button
                variant="outline"
                onClick={() => {
                  if (calendarMonth === 12) {
                    setCalendarMonth(1);
                    setCalendarYear(calendarYear + 1);
                  } else {
                    setCalendarMonth(calendarMonth + 1);
                  }
                }}
              >
                Next →
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-md p-4">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-semibold text-sm py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
                  const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
                  const cells = [];

                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    cells.push(<div key={`empty-${i}`} className="h-20 border rounded bg-gray-50"></div>);
                  }

                  // Actual days
                  for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(calendarYear, calendarMonth - 1, day);
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
                    const hasTransactions = dayTransactions.length > 0;

                    cells.push(
                      <div
                        key={day}
                        onClick={() => handleDateClick(currentDate)}
                        className="h-20 border rounded p-2 cursor-pointer hover:bg-primary/10 transition-colors relative"
                      >
                        <div className="font-semibold text-sm">{day}</div>
                        {hasTransactions && (
                          <div className="mt-1 space-y-1">
                            {dayTransactions.slice(0, 2).map((t, idx) => (
                              <div
                                key={idx}
                                className={`text-xs px-1 rounded truncate ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}
                              >
                                ₹{t.amount.toFixed(0)}
                              </div>
                            ))}
                            {dayTransactions.length > 2 && (
                              <div className="text-xs text-muted-foreground">+{dayTransactions.length - 2} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Add Dialog */}
        <Dialog open={quickAddDialogOpen} onOpenChange={setQuickAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>
                {selectedDate && `For ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={quickAddForm.type}
                  onValueChange={(v: 'income' | 'expense') =>
                    setQuickAddForm({ ...quickAddForm, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-amount">Amount</Label>
                <Input
                  id="quick-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={quickAddForm.amount}
                  onChange={(e) =>
                    setQuickAddForm({ ...quickAddForm, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-description">Description</Label>
                <Input
                  id="quick-description"
                  placeholder="Enter description"
                  value={quickAddForm.description}
                  onChange={(e) =>
                    setQuickAddForm({ ...quickAddForm, description: e.target.value })
                  }
                />
              </div>
              {quickAddForm.type === 'expense' && (
                <>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={quickAddForm.category}
                      onValueChange={(v) =>
                        setQuickAddForm({ ...quickAddForm, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={quickAddForm.payment_method}
                      onValueChange={(v) =>
                        setQuickAddForm({ ...quickAddForm, payment_method: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <DialogFooter>
                <Button type="submit">Add Transaction</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmDialogConfig?.title || 'Confirm'}</DialogTitle>
              <DialogDescription>
                {confirmDialogConfig?.message || 'Are you sure?'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  confirmDialogConfig?.onConfirm();
                  setConfirmDialogOpen(false);
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div >
  );
}
