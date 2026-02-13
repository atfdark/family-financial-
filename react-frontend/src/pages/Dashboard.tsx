import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, Transaction, Reminder } from '../services/api';
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
import { Doughnut } from 'react-chartjs-2';

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
  'Restaurant',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Atul Medicines',
  'Shopping',
  'Education',
  'Insurance',
  'Enjoy Fuel',
  'Manza Fuel',
  'Activa Fuel',
  'Milk',
  'Groceries',
  'Vegetables',
  'Fruits',
  'Alok Transportation',
  'OTT',
  'Other',
];

const PAYMENT_METHODS = [
  'Cash',
  'Alok UPI',
  'Amol UPI',
  'Atul UPI',
  'Rashmi UPI',
  'CC Rashmi Axis MyZone',
  'CC Atul Axis MyZone',
  'CC Atul Axis LIC',
  'CC Atul SBI Elite',
  'CC Rashmi SBI Elite',
  'CC Amol SBI Elite',
  'CC Amol SuperMoney'
];

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

  // Reminders state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    description: '',
    amount: '',
    due_date: '',
    frequency: 'once' as 'once' | 'monthly' | 'yearly',
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

  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('pdf');
  const [exportType, setExportType] = useState<'month' | 'financial_year'>('month');
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  // Mark Paid Dialog State
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [reminderToPay, setReminderToPay] = useState<Reminder | null>(null);
  const [paymentMethodForReminder, setPaymentMethodForReminder] = useState('');

  const handleExport = async () => {
    try {
      await api.exportTransactions({
        format: exportFormat,
        type: exportType,
        year: exportYear,
        month: exportType === 'month' ? exportMonth : undefined,
      });
      setExportDialogOpen(false);
    } catch (err) {
      setError('Failed to export transactions');
    }
  };

  const fetchReminders = useCallback(async () => {
    try {
      const data = await api.getReminders();
      setReminders(data);
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    }
  }, []);

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
    fetchReminders();
  }, [fetchTransactions, fetchReminders]);

  const periodTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    return viewMode === 'daily'
      ? date.getDate() === selectedDay &&
      date.getMonth() + 1 === selectedMonth &&
      date.getFullYear() === selectedYear
      : date.getMonth() + 1 === selectedMonth &&
      date.getFullYear() === selectedYear;
  });

  const filteredTransactions = periodTransactions
    .filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchesPaymentMethod = filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod;

      return matchesSearch && matchesCategory && matchesPaymentMethod;
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

  const periodTotalIncome = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodTotalExpenses = periodTransactions
    .filter((t) => t.type === 'expense')
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

  // Plugin to show text in center of doughnut
  const textCenter = {
    id: 'textCenter',
    beforeDatasetsDraw(chart: any) {
      const { ctx } = chart;
      ctx.save();
      const xCoor = chart.getDatasetMeta(0).data[0].x;
      const yCoor = chart.getDatasetMeta(0).data[0].y;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Get text from options or fallback
      const text = chart.config.options.plugins.textCenter?.text || `₹${totalExpenses.toFixed(2)}`;

      // Draw "Total" label
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('Total Spend', xCoor, yCoor - 15);

      // Draw Amount
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#333';
      ctx.fillText(text, xCoor, yCoor + 10);

      ctx.restore();
    }
  };

  const chartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [
      {
        data: Object.values(expensesByCategory),
        cutout: '70%',
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
      // Filter transactions before the selected date based on view mode
      let cutoffDate: Date;

      if (viewMode === 'daily') {
        cutoffDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
      } else {
        cutoffDate = new Date(selectedYear, selectedMonth - 1, 1);
      }

      return tDate < cutoffDate;
    })
    .reduce((acc, t) => {
      return acc + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

  const balance = carryForwardBalance + periodTotalIncome - periodTotalExpenses;

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

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(reminderForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    if (!reminderForm.description.trim()) {
      setError('Description is required');
      return;
    }

    if (!reminderForm.due_date) {
      setError('Due date is required');
      return;
    }

    try {
      await api.addReminder({
        description: reminderForm.description.trim(),
        amount,
        due_date: reminderForm.due_date,
        frequency: reminderForm.frequency,
      });
      setReminderForm({ description: '', amount: '', due_date: '', frequency: 'once' });
      setReminderDialogOpen(false);
      setError('');
      fetchReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reminder');
    }
  };

  const handleMarkReminderPaid = (reminder: Reminder) => {
    setReminderToPay(reminder);
    setPaymentMethodForReminder(''); // Reset selection
    setMarkPaidDialogOpen(true);
  };

  const confirmMarkPaid = async () => {
    if (!reminderToPay || !reminderToPay.id) return;

    if (!paymentMethodForReminder) {
      setError('Please select a payment method');
      return;
    }

    try {
      // Create a transaction for the paid bill
      await api.createTransaction({
        type: 'expense',
        amount: reminderToPay.amount,
        description: `Bill Payment: ${reminderToPay.description}`,
        category: 'Utilities', // Default category
        payment_method: paymentMethodForReminder,
        date: new Date().toISOString().split('T')[0],
      });

      // Update reminder status
      await api.updateReminder(reminderToPay.id, { is_paid: true });

      setMarkPaidDialogOpen(false);
      setReminderToPay(null);
      setPaymentMethodForReminder('');
      setError('');

      fetchReminders();
      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark reminder as paid');
    }
  };

  const handleDeleteReminder = async (id: number) => {
    try {
      await api.deleteReminder(id);
      fetchReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reminder');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-md p-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {username || 'User'}
          </h1>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setExportDialogOpen(true)} variant="outline" size="sm" className="flex-1 md:flex-none">
              📥 Export
            </Button>
            <Button onClick={() => setCalendarDialogOpen(true)} variant="outline" size="sm" className="flex-1 md:flex-none">
              📅 Calendar
            </Button>
            <Button
              onClick={() => setViewMode(viewMode === 'daily' ? 'monthly' : 'daily')}
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none"
            >
              {viewMode === 'daily' ? '📊 Monthly' : '📅 Daily'}
            </Button>
            <Button variant="destructive" onClick={handleLogout} size="sm" className="flex-1 md:flex-none">
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
                      <SelectTrigger className="w-full md:w-[180px]">
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
                      <SelectTrigger className="w-full md:w-[120px]">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-cyan-100 to-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <span className="text-3xl md:text-4xl">💰</span>
                Opening Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl md:text-3xl lg:text-4xl font-bold ${carryForwardBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                ₹{carryForwardBalance.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-100 to-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <span className="text-3xl md:text-4xl">↑</span>
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-green-700">
                  ₹{periodTotalIncome.toFixed(2)}
                </p>
                <p className="text-sm text-green-600/80 mt-2 font-medium">
                  FY Total: ₹{fyTotalIncome.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-100 to-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <span className="text-3xl md:text-4xl">↓</span>
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                  ₹{periodTotalExpenses.toFixed(2)}
                </p>
                <p className="text-sm text-red-600/80 mt-2 font-medium">
                  FY Total: ₹{totalFYExpenses.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-100 to-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <span className="text-3xl md:text-4xl">=</span>
                Closing Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl md:text-3xl lg:text-4xl font-bold ${balance >= 0 ? 'text-indigo-700' : 'text-red-700'
                  }`}
              >
                ₹{balance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {viewMode === 'daily' && (
          <div className="flex flex-wrap gap-4">
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-500 hover:bg-red-600">
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
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
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  Add Income
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
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
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>
                Breakdown of expenses by category for {viewMode === 'daily' ? `${selectedDay} ` : ''}{MONTHS[selectedMonth - 1]} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(expensesByCategory).length > 0 ? (
                <div className="h-[300px] md:h-[400px] flex items-center justify-center">
                  <Doughnut
                    data={chartData}
                    plugins={[textCenter]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                        // Pass dynamic data to the plugin via options
                        // @ts-ignore - Custom plugin option
                        textCenter: {
                          text: `₹${totalExpenses.toFixed(2)}`
                        }
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
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
                Recent transactions for {viewMode === 'daily' ? `${selectedDay} ` : ''}{MONTHS[selectedMonth - 1]} {selectedYear}
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
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSortOrder('newest');
                      setFilterCategory('all');
                      setFilterPaymentMethod('all');
                    }}
                    disabled={
                      searchQuery === '' &&
                      sortOrder === 'newest' &&
                      filterCategory === 'all' &&
                      filterPaymentMethod === 'all'
                    }
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                <Table className="min-w-[600px]">
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
                              <Badge className="bg-green-500 hover:bg-green-600">Income</Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium whitespace-nowrap ${transaction.type === 'income'
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



          {/* Top 5 Expenses */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-transparent">
              <CardTitle className="text-red-950 flex items-center gap-2">
                <span className="text-2xl">📉</span> Top 5 Expenses
              </CardTitle>
              <CardDescription>
                Highest spending in {viewMode === 'daily' ? `${selectedDay} ` : ''}{MONTHS[selectedMonth - 1]} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredTransactions
                .filter((t) => t.type === 'expense')
                .length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {(() => {
                    const expenses = filteredTransactions
                      .filter((t) => t.type === 'expense')
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 5);
                    const maxExpense = expenses[0]?.amount || 1;

                    return expenses.map((transaction, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50 transition-colors relative group">
                        {/* Progress Bar Background */}
                        <div
                          className="absolute bottom-0 left-0 h-1 bg-red-500/20 transition-all duration-500"
                          style={{ width: `${(transaction.amount / maxExpense) * 100}%` }}
                        />

                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-lg">
                              {index + 1}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-semibold text-gray-900">{transaction.description}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs py-0 h-5 font-normal border-red-200 text-red-700 bg-red-50">
                                  {transaction.category}
                                </Badge>
                                <span>•</span>
                                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-red-600 whitespace-nowrap">
                              -₹{transaction.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">
                              {/* Calculate percentage of total expenses if available, else relative to max */}
                              {totalExpenses > 0 ? (
                                <span>{((transaction.amount / totalExpenses) * 100).toFixed(1)}% of total</span>
                              ) : (
                                <span>{((transaction.amount / maxExpense) * 100).toFixed(0)}% vs top</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No Expenses Yet</h3>
                  <p className="text-sm text-gray-500 max-w-[250px] mt-1">
                    Start adding expenses to see your top spending habits here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill Reminders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bill Reminders</CardTitle>
                <CardDescription>
                  Upcoming bills and payments
                </CardDescription>
              </div>
              <Button onClick={() => setReminderDialogOpen(true)} variant="outline" size="sm">
                + Add Reminder
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No active reminders
                        </TableCell>
                      </TableRow>
                    ) : (
                      reminders.map((reminder) => (
                        <TableRow key={reminder.id} className={reminder.is_paid ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{reminder.description}</TableCell>
                          <TableCell>
                            {reminder.frequency === 'monthly' && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Monthly</Badge>}
                            {reminder.frequency === 'yearly' && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Yearly</Badge>}
                            {(!reminder.frequency || reminder.frequency === 'once') && <Badge variant="outline" className="text-gray-500">Once</Badge>}
                          </TableCell>
                          <TableCell>
                            {new Date(reminder.due_date).toLocaleDateString()}
                            {new Date(reminder.due_date) < new Date() && !reminder.is_paid && (
                              <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">₹{reminder.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!reminder.is_paid && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkReminderPaid(reminder)}
                                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  Mark Paid
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => reminder.id && handleDeleteReminder(reminder.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              >
                                🗑️
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

        <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Bill Reminder</DialogTitle>
              <DialogDescription>
                Set a reminder for upcoming bills.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddReminder}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-description">Description</Label>
                  <Input
                    id="reminder-description"
                    placeholder="e.g. Electricity Bill"
                    value={reminderForm.description}
                    onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-amount">Amount</Label>
                    <Input
                      id="reminder-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={reminderForm.amount}
                      onChange={(e) => setReminderForm({ ...reminderForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminder-date">Due Date</Label>
                    <Input
                      id="reminder-date"
                      type="date"
                      value={reminderForm.due_date}
                      onChange={(e) => setReminderForm({ ...reminderForm, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-frequency">Frequency</Label>
                  <Select
                    value={reminderForm.frequency}
                    onValueChange={(v: 'once' | 'monthly' | 'yearly') =>
                      setReminderForm({ ...reminderForm, frequency: v })
                    }
                  >
                    <SelectTrigger id="reminder-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit">Add Reminder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
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
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-[95vw]">
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
            <DialogHeader>
              <DialogTitle>Calendar View</DialogTitle>
              <DialogDescription>
                Click any date to view transactions for that day
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
                    // Use local date string construction to avoid UTC timezone shifts
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

                    const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
                    const dayExpenses = dayTransactions
                      .filter(t => t.type === 'expense')
                      .reduce((sum, t) => sum + t.amount, 0);
                    const dayIncome = dayTransactions
                      .filter(t => t.type === 'income')
                      .reduce((sum, t) => sum + t.amount, 0);

                    let bgClass = 'hover:bg-primary/10';
                    if (dayIncome > dayExpenses) {
                      bgClass = 'bg-green-100 hover:bg-green-200 border-green-200';
                    } else if (dayExpenses > 5000) {
                      bgClass = 'bg-red-100 hover:bg-red-200 border-red-200';
                    }

                    cells.push(
                      <div
                        key={day}
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedMonth(calendarMonth);
                          setSelectedYear(calendarYear);
                          setViewMode('daily');
                          setCalendarDialogOpen(false);
                        }}
                        className={`h-24 border rounded p-2 cursor-pointer transition-colors relative flex flex-col justify-between ${bgClass}`}
                      >
                        <div className="font-semibold text-sm">{day}</div>
                        {(dayExpenses > 0 || dayIncome > 0) && (
                          <div className="space-y-1 text-xs font-medium">
                            {dayExpenses > 0 && (
                              <div className="text-red-700">
                                -₹{dayExpenses.toFixed(0)}
                              </div>
                            )}
                            {dayIncome > 0 && (
                              <div className="text-green-700">
                                +₹{dayIncome.toFixed(0)}
                              </div>
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
          <DialogContent className="sm:max-w-[425px]">
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
          <DialogContent className="sm:max-w-[425px]">
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



        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Export Transactions</DialogTitle>
              <DialogDescription>
                Download your transaction history as PDF or CSV.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(v: 'csv' | 'pdf') => setExportFormat(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF (Printable Report)</SelectItem>
                    <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select
                  value={exportType}
                  onValueChange={(v: 'month' | 'financial_year') => setExportType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Specific Month</SelectItem>
                    <SelectItem value="financial_year">Financial Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportType === 'month' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select
                      value={exportMonth.toString()}
                      onValueChange={(v) => setExportMonth(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select
                      value={exportYear.toString()}
                      onValueChange={(v) => setExportYear(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Select
                    value={exportYear.toString()}
                    onValueChange={(v) => setExportYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          FY {y}-{y + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setExportDialogOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleExport}>
                Download {exportFormat.toUpperCase()}
              </Button>
            </DialogFooter>
          </DialogContent>
          {/* Mark Paid Dialog */}
          <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Mark Bill as Paid</DialogTitle>
                <DialogDescription>
                  Select payment method for {reminderToPay?.description} (₹{reminderToPay?.amount})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethodForReminder}
                    onValueChange={setPaymentMethodForReminder}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMarkPaidDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmMarkPaid}>
                  Confirm Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </main >
    </div >
  );
}
