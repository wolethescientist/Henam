import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  AttachMoney,
  Receipt,
  Analytics,
} from '@mui/icons-material';
import InvoiceTab from './InvoiceTab';
import ExpenseTab from './ExpenseTab';
import AnalyticsTab from './AnalyticsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`finance-tabpanel-${index}`}
      aria-labelledby={`finance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `finance-tab-${index}`,
    'aria-controls': `finance-tabpanel-${index}`,
  };
}

const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AttachMoney sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Finance Management
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="finance tabs"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          <Tab
            icon={<Receipt />}
            label="Invoices"
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            icon={<AttachMoney />}
            label="Expenses"
            iconPosition="start"
            {...a11yProps(1)}
          />
          <Tab
            icon={<Analytics />}
            label="Analytics"
            iconPosition="start"
            {...a11yProps(2)}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <InvoiceTab />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <ExpenseTab />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <AnalyticsTab />
      </TabPanel>
    </Box>
  );
};

export default FinancePage;
