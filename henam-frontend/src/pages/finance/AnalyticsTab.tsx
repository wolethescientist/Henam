import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  Download,
} from '@mui/icons-material';
import { Skeleton } from '@mui/material';
import { useGetFinancialAnalyticsQuery, useExportFinancialAnalyticsPdfMutation } from '../../store/api/financialAnalyticsApi';
import { formatCurrency } from '../../utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const AnalyticsTab: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  
  // Debounced date range to prevent rapid API calls
  const [debouncedYear, setDebouncedYear] = useState(currentYear);
  const [debouncedMonth, setDebouncedMonth] = useState<number | 'all'>('all');
  const [debouncedWeek, setDebouncedWeek] = useState<number | 'all'>('all');
  
  // Debounce filter changes (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedYear(selectedYear);
      setDebouncedMonth(selectedMonth);
      setDebouncedWeek(selectedWeek);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selectedYear, selectedMonth, selectedWeek]);
  
  // Calculate start and end dates based on debounced selections
  const getDateRange = () => {
    if (debouncedMonth === 'all') {
      // Show entire year
      return {
        start_date: `${debouncedYear}-01-01`,
        end_date: `${debouncedYear}-12-31`,
      };
    }
    
    // Show specific month
    const monthNum = debouncedMonth + 1; // Convert 0-11 to 1-12
    const monthStr = monthNum.toString().padStart(2, '0');
    const lastDay = new Date(debouncedYear, debouncedMonth + 1, 0).getDate();
    
    if (debouncedWeek === 'all') {
      return {
        start_date: `${debouncedYear}-${monthStr}-01`,
        end_date: `${debouncedYear}-${monthStr}-${lastDay}`,
      };
    }
    
    // Show specific week (simplified: week 1 = days 1-7, week 2 = 8-14, etc.)
    const weekStart = (debouncedWeek - 1) * 7 + 1;
    const weekEnd = Math.min(weekStart + 6, lastDay);
    return {
      start_date: `${debouncedYear}-${monthStr}-${weekStart.toString().padStart(2, '0')}`,
      end_date: `${debouncedYear}-${monthStr}-${weekEnd.toString().padStart(2, '0')}`,
    };
  };

  const dateRange = getDateRange();
  
  const { data: analytics, isLoading, error } = useGetFinancialAnalyticsQuery({
    period: 'custom',
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });
  const [exportFinancialAnalyticsPdf] = useExportFinancialAnalyticsPdfMutation();

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth('all');
    setSelectedWeek('all');
  };

  const handleMonthChange = (month: number | 'all') => {
    setSelectedMonth(month);
    setSelectedWeek('all');
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate available years (current year and 2 years back)
  const availableYears = [currentYear, currentYear - 1, currentYear - 2];
  
  // Calculate number of weeks in selected month
  const weeksInMonth = selectedMonth !== 'all' 
    ? Math.ceil(new Date(selectedYear, selectedMonth + 1, 0).getDate() / 7)
    : 0;

  const handleExportPDF = async () => {
    try {
      const blob = await exportFinancialAnalyticsPdf({
        period: 'custom',
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      }).unwrap();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const monthName = selectedMonth === 'all' ? 'year' : months[selectedMonth as number];
      a.href = url;
      a.download = `financial_analytics_${selectedYear}_${monthName}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export analytics PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <Box>
        {/* Header and Controls Skeleton */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rectangular" width={150} height={40} />
            <Skeleton variant="rectangular" width={120} height={40} />
          </Box>
        </Box>

        {/* Period Selector Skeleton */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Skeleton variant="rectangular" width={200} height={56} />
          <Skeleton variant="rectangular" width={150} height={56} />
          <Skeleton variant="rectangular" width={150} height={56} />
        </Box>

        {/* Financial Overview Skeleton */}
        <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Skeleton variant="circular" width={28} height={28} sx={{ mr: 2 }} />
              <Skeleton variant="text" width={200} height={32} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
              {[1, 2, 3, 4].map((index) => (
                <Card key={index} sx={{ backgroundColor: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Skeleton variant="text" width={120} height={32} />
                        <Skeleton variant="text" width={80} height={20} />
                      </Box>
                      <Skeleton variant="circular" width={32} height={32} />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Summary Cards Skeleton */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
          {[1, 2, 3, 4].map((index) => (
            <Card key={index}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Skeleton variant="text" width={120} height={32} />
                    <Skeleton variant="text" width={80} height={20} />
                  </Box>
                  <Skeleton variant="circular" width={40} height={40} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Charts Grid Skeleton */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
          {/* Bar Chart Skeleton */}
          <Card>
            <CardContent>
              <Skeleton variant="text" width={200} height={30} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={300} />
            </CardContent>
          </Card>

          {/* Pie Chart Skeleton */}
          <Card>
            <CardContent>
              <Skeleton variant="text" width={200} height={30} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={300} />
            </CardContent>
          </Card>
        </Box>

        {/* Line Chart Skeleton */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Skeleton variant="text" width={200} height={30} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={300} />
          </CardContent>
        </Card>

        {/* Expense Distribution Table Skeleton */}
        <Card>
          <CardContent>
            <Skeleton variant="text" width={200} height={30} sx={{ mb: 2 }} />
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    {['Category', 'Amount', 'Percentage'].map((header) => (
                      <TableCell key={header}>
                        <Skeleton variant="text" width={80} height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton variant="text" width={100} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={60} height={20} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load analytics data. Please try again.
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info">
        No analytics data available.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Financial Analytics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExportPDF}
        >
          Export PDF
        </Button>
      </Box>

      {/* Hierarchical Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Year Selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                label="Year"
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Month Selector */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                label="Month"
              >
                <MenuItem value="all">All Months</MenuItem>
                {months.map((month, index) => (
                  <MenuItem key={index} value={index}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Week Selector (only show if month is selected) */}
            {selectedMonth !== 'all' && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Week</InputLabel>
                <Select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  label="Week"
                >
                  <MenuItem value="all">All Weeks</MenuItem>
                  {Array.from({ length: weeksInMonth }, (_, i) => i + 1).map((week) => (
                    <MenuItem key={week} value={week}>
                      Week {week}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Date Range Display */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing: {dateRange.start_date} to {dateRange.end_date}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* No Data Warning */}
      {analytics && analytics.total_expenses === 0 && analytics.top_expense_categories.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No expense data found for the selected period ({dateRange.start_date} to {dateRange.end_date}). 
          Try selecting a different year or month that contains expense data.
        </Alert>
      )}


      {/* Financial Overview Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AttachMoney sx={{ mr: 2, color: 'success.main', fontSize: 28 }} />
        <Typography variant="h5" component="h2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
          Financial Overview
        </Typography>
      </Box>

      {/* Core Financial Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Receipt sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(analytics.total_invoiced)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Invoiced
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(analytics.total_paid)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Paid
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Receipt sx={{ mr: 2, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(analytics.total_pending)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Financial Performance Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ mr: 2, color: 'info.main' }} />
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(analytics.total_expenses)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Expenses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {analytics.profit_loss >= 0 ? (
                  <TrendingUp sx={{ mr: 2, color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ mr: 2, color: 'error.main' }} />
                )}
                <Box>
                  <Typography 
                    variant="h6"
                    color={analytics.profit_loss >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(analytics.profit_loss)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Profit/Loss
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" color="primary.main">
                    {analytics.payment_rate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Payment Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Invoice Counts Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* Overdue Count */}
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingDown sx={{ mr: 2, color: 'error.main' }} />
                <Box>
                  <Typography variant="h6" color="error.main">
                    {analytics.overdue_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Paid Count */}
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6" color="success.main">
                    {analytics.paid_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paid Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Pending Count */}
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Receipt sx={{ mr: 2, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6" color="warning.main">
                    {analytics.pending_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

      </Box>

      {/* Charts Row 1 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* Top 5 Expense Categories */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 5 Expense Categories
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.top_expense_categories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="total_amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Expense Distribution */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expense Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.expense_distribution.map(item => ({
                      name: item.category,
                      value: item.amount,
                      percentage: item.percentage
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.expense_distribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Profit/Loss Trend - Full Width */}
      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profit/Loss Trend
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analytics.profit_loss_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#82ca9d" name="Expenses" />
                <Line type="monotone" dataKey="profit_loss" stroke="#ffc658" name="Profit/Loss" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Invoice Status Distribution - Full Width */}
      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Invoice Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={analytics.invoice_status_distribution.map(item => ({
                    name: item.status,
                    value: item.count,
                    amount: item.amount
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.invoice_status_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [
                  `${value} invoices (${formatCurrency(props.payload.amount)})`,
                  name
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default AnalyticsTab;
