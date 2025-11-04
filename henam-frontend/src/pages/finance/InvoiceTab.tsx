import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
  TablePagination,
  Skeleton,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Download,
  Visibility,
  Search,
  Payment,
} from '@mui/icons-material';
import {
  useDeleteInvoiceMutation,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useUpdateInvoicePaymentMutation,
} from '../../store/api/invoicesApi';
import { useGetUnifiedInvoicesDataQuery } from '../../store/api/unifiedApis';
import { useAppSelector } from '../../hooks/redux';
import type { Invoice, CreateInvoiceForm } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import KebabMenu from '../../components/common/KebabMenu';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useToast } from '../../contexts/ToastContext';

const InvoiceTab: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isAdditionalPayment, setIsAdditionalPayment] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateInvoiceForm>({
    client_name: '',
    job_type: '',
    job_details: '',
    amount: 0,
    paid_amount: 0,
    due_date: '',
    description: '',
  });

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [statusFilter, debouncedSearchTerm]);

  const { data: invoicesResponse, isLoading, error, isFetching, refetch } = useGetUnifiedInvoicesDataQuery({
    page: page + 1,
    limit: rowsPerPage,
    ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
    ...(statusFilter && { status_filter: statusFilter }),
  });

  const invoices = invoicesResponse?.invoices || [];
  const totalCount = invoicesResponse?.pagination?.total_count || 0;
  // Jobs query removed - no longer needed for standalone invoices
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();
  const [updateInvoice, { isLoading: isUpdating }] = useUpdateInvoiceMutation();
  const [updateInvoicePayment, { isLoading: isUpdatingPayment }] = useUpdateInvoicePaymentMutation();
  const { accessToken } = useAppSelector((state) => state.auth);
  const { showSuccess, showError } = useToast();

  const handleCreateInvoice = () => {
    setFormData({
      client_name: '',
      job_type: '',
      job_details: '',
      amount: 0,
      paid_amount: 0,
      due_date: '',
      description: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      job_id: invoice.job_id,
      job_type: invoice.job_type || '',
      client_name: invoice.client_name,
      job_details: invoice.job_details || '',
      amount: invoice.amount,
      paid_amount: invoice.paid_amount,
      due_date: invoice.due_date.split('T')[0],
      description: invoice.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewDialogOpen(true);
  };

  const handleUpdatePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.paid_amount);
    setIsAdditionalPayment(false);
    setIsPaymentDialogOpen(true);
  };

  const handleDeleteInvoice = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(id).unwrap();
      } catch (error) {
        console.error('Failed to delete invoice:', error);
      }
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      setDownloadingPdf(invoice.id);

      if (!accessToken) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${baseUrl}/invoices/${invoice.id}/pdf`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Received empty file');
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `invoice_${invoice.invoice_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.style.display = 'none';

      // Trigger download
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
    } catch (error) {
      console.error('Failed to download invoice PDF:', error);
      alert('Failed to download invoice PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleSubmitCreate = async () => {
    try {
      const result = await createInvoice(formData).unwrap();
      setIsCreateDialogOpen(false);
      setFormData({
        client_name: '',
        job_type: '',
        job_details: '',
        amount: 0,
        paid_amount: 0,
        due_date: '',
        description: '',
      });

      // Force refetch the invoices list to ensure new invoice appears
      await refetch();

      // Show success toast
      showSuccess(
        `Invoice ${result.invoice_number} created successfully! ${
          result.converted_to_job 
            ? 'Automatically converted to job due to payment received.' 
            : 'You can download the PDF from the Actions menu.'
        }`
      );
    } catch (error) {
      console.error('Failed to create invoice:', error);
      showError('Failed to create invoice. Please try again.');
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedInvoice) return;
    try {
      const result = await updateInvoice({ id: selectedInvoice.id, data: formData }).unwrap();
      setIsEditDialogOpen(false);

      // Show success toast
      if (result.converted_to_job && !selectedInvoice.converted_to_job) {
        showSuccess(`Invoice updated successfully! Payment received - automatically converted to job #${result.converted_job_id}.`);
      } else {
        showSuccess('Invoice updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update invoice:', error);
      alert('Failed to update invoice. Please try again.');
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return;
    try {
      // Calculate the final payment amount
      const finalPaymentAmount = isAdditionalPayment 
        ? selectedInvoice.paid_amount + paymentAmount 
        : paymentAmount;

      const result = await updateInvoicePayment({ 
        id: selectedInvoice.id, 
        paid_amount: finalPaymentAmount 
      }).unwrap();
      
      setIsPaymentDialogOpen(false);
      setPaymentAmount(0);
      setIsAdditionalPayment(false);

      // Show success toast
      if (result.converted_to_job && !selectedInvoice.converted_to_job) {
        showSuccess(`Payment updated successfully! Invoice automatically converted to job #${result.converted_job_id}.`);
      } else {
        showSuccess('Payment updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update payment:', error);
      showError('Failed to update payment. Please try again.');
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading || (!invoicesResponse && !error)) {
    return (
      <Box>
        {/* Header Skeleton */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rectangular" width={120} height={36} />
            <Skeleton variant="rectangular" width={120} height={36} />
          </Box>
        </Box>

        {/* Filters Skeleton */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Skeleton variant="rectangular" width={200} height={56} />
          <Skeleton variant="rectangular" width={150} height={56} />
        </Box>

        {/* Summary Cards Skeleton */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
          {[1, 2, 3, 4].map((index) => (
            <Card key={index}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
                  <Box>
                    <Skeleton variant="text" width={100} height={32} />
                    <Skeleton variant="text" width={80} height={20} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Table Skeleton */}
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    {['Invoice #', 'Client', 'Amount', 'Status', 'Due Date', 'Actions'].map((header) => (
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
                        <Skeleton variant="text" width={120} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="rectangular" width={80} height={24} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} height={20} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Skeleton variant="circular" width={32} height={32} />
                          <Skeleton variant="circular" width={32} height={32} />
                          <Skeleton variant="circular" width={32} height={32} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Pagination Skeleton */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Skeleton variant="text" width={150} height={20} />
              <Skeleton variant="rectangular" width={200} height={32} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Show skeleton loading state while data is being fetched
  if (isLoading) {
    return <SkeletonLoader variant="invoices" count={10} showHeader={true} showFilters={true} />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load invoices. Please try again.
        <br />
        <small>Error: {'data' in error ? String(error.data) : 'Unknown error'}</small>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" component="h2">
            Invoice Management
          </Typography>
          {isFetching && (
            <CircularProgress size={20} />
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateInvoice}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Search and Filter Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="partial">Partial</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Invoices Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Job Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Paid</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Converted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {invoice.invoice_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {invoice.client_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {invoice.job_type || invoice.job?.title || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(invoice.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(invoice.paid_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="warning.main">
                        {formatCurrency(invoice.pending_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        color={getStatusColor(invoice.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {invoice.converted_to_job ? (
                        <Chip
                          label="Converted to Job"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <KebabMenu
                        actions={[
                          {
                            label: 'View Details',
                            icon: <Visibility />,
                            onClick: () => handleViewInvoice(invoice),
                          },
                          {
                            label: downloadingPdf === invoice.id ? 'Generating PDF...' : 'Download PDF',
                            icon: downloadingPdf === invoice.id ? <CircularProgress size={16} /> : <Download />,
                            onClick: () => handleDownloadPdf(invoice),
                            disabled: downloadingPdf === invoice.id,
                          },
                          {
                            label: 'Update Payment',
                            icon: <Payment />,
                            onClick: () => handleUpdatePayment(invoice),
                          },
                          {
                            label: 'Edit Invoice',
                            icon: <Edit />,
                            onClick: () => handleEditInvoice(invoice),
                            divider: true,
                          },
                          {
                            label: 'Delete Invoice',
                            icon: <Delete />,
                            onClick: () => handleDeleteInvoice(invoice.id),
                            color: 'error',
                          },
                        ]}
                        tooltip="Invoice actions"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Invoice</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>New Workflow:</strong> Create invoices instantly! The invoice will appear in your list immediately, and you'll receive a system notification when it's ready.
              You can download the PDF from the Actions menu. When the client makes any payment (partial or full), the system will automatically convert this invoice into a job.
            </Typography>
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Client Name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              fullWidth
              required
              helperText="Name of the client for this invoice"
            />
            <TextField
              label="Type of Job"
              value={formData.job_type}
              onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
              fullWidth
              required
              helperText="e.g., Web Development, Consulting, Design, etc."
            />
            <TextField
              label="Job Details"
              multiline
              rows={3}
              value={formData.job_details}
              onChange={(e) => setFormData({ ...formData, job_details: e.target.value })}
              fullWidth
              required
              helperText="Detailed description of the work to be performed"
            />
            <TextField
              label="Total Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label="Amount Paid by Client (Optional)"
              type="number"
              value={formData.paid_amount || 0}
              onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
              helperText="If client pays immediately, enter amount here. Otherwise leave as 0."
              fullWidth
            />
            <TextField
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="Additional Notes (Optional)"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              helperText="Any additional notes or terms for this invoice"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitCreate}
            disabled={isCreating}
            startIcon={isCreating ? <CircularProgress size={20} /> : null}
          >
            {isCreating ? 'Creating Invoice...' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Invoice</DialogTitle>
        <DialogContent>
          {selectedInvoice?.converted_to_job && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Invoice Converted:</strong> This invoice has been converted to a job because payment was received.
                {selectedInvoice.converted_job_id && (
                  <span> Job ID: #{selectedInvoice.converted_job_id}</span>
                )}
              </Typography>
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Client Name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Type of Job"
              value={formData.job_type}
              onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
              fullWidth
            />
            <TextField
              label="Job Details"
              multiline
              rows={3}
              value={formData.job_details}
              onChange={(e) => setFormData({ ...formData, job_details: e.target.value })}
              fullWidth
            />
            <TextField
              label="Total Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Amount Paid by Client"
              type="number"
              value={formData.paid_amount || 0}
              onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
              helperText="Update this when client makes payments. If this is the first payment, the invoice will be converted to a job automatically."
              fullWidth
            />
            <TextField
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Additional Notes"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitEdit}
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={20} /> : null}
          >
            {isUpdating ? 'Updating Invoice...' : 'Update Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Invoice Details</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedInvoice.converted_to_job && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Converted to Job:</strong> This invoice was automatically converted to a job when payment was received.
                    {selectedInvoice.converted_job_id && (
                      <span> Job ID: #{selectedInvoice.converted_job_id}</span>
                    )}
                  </Typography>
                </Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Invoice Number</Typography>
                  <Typography variant="body1">{selectedInvoice.invoice_number}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedInvoice.status}
                    color={getStatusColor(selectedInvoice.status) as any}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Client Name</Typography>
                  <Typography variant="body1">{selectedInvoice.client_name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Job Type</Typography>
                  <Typography variant="body1">{selectedInvoice.job_type || selectedInvoice.job?.title || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(selectedInvoice.amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Paid Amount</Typography>
                  <Typography variant="body1" color="success.main">
                    {formatCurrency(selectedInvoice.paid_amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Pending Amount</Typography>
                  <Typography variant="body1" color="warning.main">
                    {formatCurrency(selectedInvoice.pending_amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
                  <Typography variant="body1">{formatDate(selectedInvoice.due_date)}</Typography>
                </Box>
              </Box>
              {selectedInvoice.job_details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Job Details</Typography>
                  <Typography variant="body1">{selectedInvoice.job_details}</Typography>
                </Box>
              )}
              {selectedInvoice.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Additional Notes</Typography>
                  <Typography variant="body1">{selectedInvoice.description}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          {selectedInvoice && (
            <Button
              variant="contained"
              startIcon={downloadingPdf === selectedInvoice.id ? <CircularProgress size={20} /> : <Download />}
              onClick={() => handleDownloadPdf(selectedInvoice)}
              disabled={downloadingPdf === selectedInvoice.id}
            >
              {downloadingPdf === selectedInvoice.id ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Update Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Payment</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Update the payment amount. If this is the first payment, the invoice will be automatically converted to a job.
                </Typography>
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Payment Type:</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={!isAdditionalPayment ? "contained" : "outlined"}
                    size="small"
                    onClick={() => {
                      setIsAdditionalPayment(false);
                      setPaymentAmount(selectedInvoice.paid_amount);
                    }}
                  >
                    Set Total Paid
                  </Button>
                  <Button
                    variant={isAdditionalPayment ? "contained" : "outlined"}
                    size="small"
                    onClick={() => {
                      setIsAdditionalPayment(true);
                      setPaymentAmount(0);
                    }}
                  >
                    Add Payment
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Invoice Number</Typography>
                  <Typography variant="body1" fontWeight="medium">{selectedInvoice.invoice_number}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Client</Typography>
                  <Typography variant="body1">{selectedInvoice.client_name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="body1" fontWeight="medium">{formatCurrency(selectedInvoice.amount)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Current Paid</Typography>
                  <Typography variant="body1" color="success.main">{formatCurrency(selectedInvoice.paid_amount)}</Typography>
                </Box>
              </Box>

              <TextField
                label={isAdditionalPayment ? "Additional Payment Amount" : "Total Amount Paid by Client"}
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                fullWidth
                required
                inputProps={{ 
                  min: 0, 
                  max: isAdditionalPayment 
                    ? selectedInvoice.amount - selectedInvoice.paid_amount 
                    : selectedInvoice.amount,
                  step: 0.01 
                }}
                helperText={
                  isAdditionalPayment 
                    ? `Adding to current payment of ${formatCurrency(selectedInvoice.paid_amount)}. New total will be: ${formatCurrency(selectedInvoice.paid_amount + paymentAmount)}`
                    : `Setting total paid amount. Remaining balance: ${formatCurrency(selectedInvoice.amount - paymentAmount)}`
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)} disabled={isUpdatingPayment}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitPayment}
            disabled={
              isUpdatingPayment || 
              !selectedInvoice || 
              paymentAmount < 0 || 
              (isAdditionalPayment 
                ? (selectedInvoice.paid_amount + paymentAmount) > selectedInvoice.amount
                : paymentAmount > selectedInvoice.amount
              )
            }
            startIcon={isUpdatingPayment ? <CircularProgress size={20} /> : null}
          >
            {isUpdatingPayment ? 'Updating Payment...' : 'Update Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceTab;
