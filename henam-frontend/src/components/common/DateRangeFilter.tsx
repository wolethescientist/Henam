import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarToday, Clear } from '@mui/icons-material';

export interface DateFilterValue {
  type: 'custom' | 'month' | 'year' | 'week';
  startDate?: Date;
  endDate?: Date;
  month?: number;
  year?: number;
  week?: number;
}

interface DateRangeFilterProps {
  value?: DateFilterValue | null;
  onChange: (filter: DateFilterValue | null) => void;
  label?: string;
  showWeekFilter?: boolean;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  label = "Date Filter",
  showWeekFilter = false
}) => {
  const [filterType, setFilterType] = useState<'custom' | 'month' | 'year' | 'week'>(
    value?.type || 'month'
  );
  const [startDate, setStartDate] = useState<Date | null>(value?.startDate || null);
  const [endDate, setEndDate] = useState<Date | null>(value?.endDate || null);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    value?.month || new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    value?.year || new Date().getFullYear()
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(value?.week || 1);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const handleApplyFilter = () => {
    let filter: DateFilterValue;

    switch (filterType) {
      case 'custom':
        if (startDate && endDate) {
          filter = {
            type: 'custom',
            startDate,
            endDate,
          };
        } else {
          return; // Don't apply if dates are missing
        }
        break;
      case 'month':
        filter = {
          type: 'month',
          month: selectedMonth,
          year: selectedYear,
        };
        break;
      case 'year':
        filter = {
          type: 'year',
          year: selectedYear,
        };
        break;
      case 'week':
        filter = {
          type: 'week',
          week: selectedWeek,
          year: selectedYear,
        };
        break;
      default:
        return;
    }

    onChange(filter);
  };

  const handleClearFilter = () => {
    onChange(null);
    setStartDate(null);
    setEndDate(null);
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setSelectedWeek(1);
  };

  const getFilterDescription = () => {
    if (!value) return null;

    switch (value.type) {
      case 'custom':
        return `${value.startDate?.toLocaleDateString()} - ${value.endDate?.toLocaleDateString()}`;
      case 'month':
        const monthName = months.find(m => m.value === value.month)?.label;
        return `${monthName} ${value.year}`;
      case 'year':
        return `${value.year}`;
      case 'week':
        return `Week ${value.week}, ${value.year}`;
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            {label}
          </Typography>
          {value && (
            <Button
              startIcon={<Clear />}
              onClick={handleClearFilter}
              size="small"
              color="secondary"
            >
              Clear
            </Button>
          )}
        </Box>

        {value && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={getFilterDescription()}
              color="primary"
              variant="outlined"
              onDelete={handleClearFilter}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Filter Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              label="Filter Type"
            >
              <MenuItem value="month">By Month</MenuItem>
              <MenuItem value="year">By Year</MenuItem>
              {showWeekFilter && <MenuItem value="week">By Week</MenuItem>}
              <MenuItem value="custom">Custom Range</MenuItem>
            </Select>
          </FormControl>

          {filterType === 'custom' && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{
                  textField: {
                    size: 'small'
                  }
                }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{
                  textField: {
                    size: 'small'
                  }
                }}
              />
            </Box>
          )}

          {(filterType === 'month' || filterType === 'week') && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value as number)}
                  label="Year"
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {filterType === 'month' && (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value as number)}
                    label="Month"
                  >
                    {months.map((month) => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {filterType === 'week' && (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Week</InputLabel>
                  <Select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value as number)}
                    label="Week"
                  >
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                      <MenuItem key={week} value={week}>
                        Week {week}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}

          {filterType === 'year' && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as number)}
                label="Year"
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleApplyFilter}
              disabled={
                filterType === 'custom' && (!startDate || !endDate)
              }
            >
              Apply Filter
            </Button>
          </Box>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default DateRangeFilter;