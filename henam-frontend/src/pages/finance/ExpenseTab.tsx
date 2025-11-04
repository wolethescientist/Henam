import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Autocomplete,
  Divider,
  Pagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Download,
  Visibility,
  AttachMoney,
  Category,
  AddCircle,
} from '@mui/icons-material';
import { Skeleton } from '@mui/material';
import {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useExportExpensesExcelMutation,
  useGetExpensesSummaryQuery,
} from '../../store/api/expensesApi';
import {
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
} from '../../store/api/expenseCategoriesApi';
import type { Expense, CreateExpenseForm, ExpenseCategory, CreateExpenseCategoryForm } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import KebabMenu from '../../components/common/KebabMenu';

const ExpenseTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState<CreateExpenseForm>({
    title: '',
    category: '',
    category_id: undefined,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [categoryFormData, setCategoryFormData] = useState<CreateExpenseCategoryForm>({
    name: '',
    description: '',
  });

  const { data: expensesData, isLoading, error } = useGetExpensesQuery({ page, limit });
  const expenses = expensesData?.items || [];
  const totalPages = expensesData?.total_pages || 0;
  const totalCount = expensesData?.total_count || 0;
  const { data: summary } = useGetExpensesSummaryQuery({});
  const { data: categories = [], isLoading: categoriesLoading } = useGetExpenseCategoriesQuery({ active_only: true });
  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const [exportExpensesExcel] = useExportExpensesExcelMutation();
  const [createCategory] = useCreateExpenseCategoryMutation();
  const [updateCategory] = useUpdateExpenseCategoryMutation();
  const [deleteCategory] = useDeleteExpenseCategoryMutation();

  const handleCreateExpense = () => {
    setFormData({
      title: '',
      category: '',
      category_id: undefined,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreateCategory = () => {
    setCategoryFormData({
      name: '',
      description: '',
    });
    setSelectedCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    });
    setIsCategoryDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      title: expense.title,
      category: expense.category,
      category_id: expense.category_id,
      amount: expense.amount,
      date: expense.date.split('T')[0],
      description: expense.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsViewDialogOpen(true);
  };

  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id).unwrap();
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const handleSubmitCreate = async () => {
    try {
      // If category_id is selected, use the category name from the selected category
      const submitData = { ...formData };
      if (submitData.category_id) {
        const selectedCat = categories.find(cat => cat.id === submitData.category_id);
        if (selectedCat) {
          submitData.category = selectedCat.name;
        }
      }
      await createExpense(submitData).unwrap();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedExpense) return;
    try {
      // If category_id is selected, use the category name from the selected category
      const submitData = { ...formData };
      if (submitData.category_id) {
        const selectedCat = categories.find(cat => cat.id === submitData.category_id);
        if (selectedCat) {
          submitData.category = selectedCat.name;
        }
      }
      await updateExpense({ id: selectedExpense.id, data: submitData }).unwrap();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  };

  const handleSubmitCategory = async () => {
    try {
      if (selectedCategory) {
        await updateCategory({ id: selectedCategory.id, data: categoryFormData }).unwrap();
      } else {
        await createCategory(categoryFormData).unwrap();
      }
      setIsCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category? It will be deactivated if used by expenses.')) {
      try {
        await deleteCategory(id).unwrap();
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const handleCategoryChange = (categoryId: number | null) => {
    if (categoryId) {
      const selectedCat = categories.find(cat => cat.id === categoryId);
      if (selectedCat) {
        setFormData({
          ...formData,
          category_id: categoryId,
          category: selectedCat.name
        });
      }
    } else {
      setFormData({
        ...formData,
        category_id: undefined,
        category: ''
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await exportExpensesExcel({}).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export expenses:', error);
    }
  };

  if (isLoading) {
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

        {/* Summary Cards Skeleton */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
          {[1, 2].map((index) => (
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
                    {['Title', 'Category', 'Amount', 'Date', 'Created By', 'Actions'].map((header) => (
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
                        <Skeleton variant="text" width={120} height={20} />
                        <Skeleton variant="text" width={80} height={16} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="rectangular" width={80} height={24} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={60} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={100} height={20} />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton variant="circular" width={32} height={32} />
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
        Failed to load expenses. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Expense Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateExpense}
          >
            Add Expense
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
          <Box>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoney sx={{ mr: 2, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6">{formatCurrency(summary.total_amount)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
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
                  <AttachMoney sx={{ mr: 2, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h6">{summary.category_count}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Categories
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Expenses Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {expenses.length > 0 ? ((page - 1) * limit + 1) : 0} - {Math.min(page * limit, totalCount)} of {totalCount} expenses
            </Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No expenses found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {expense.title}
                        </Typography>
                        {expense.description && (
                          <Typography variant="caption" color="text.secondary">
                            {expense.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={expense.category} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(expense.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell>
                        {expense.created_by?.name || 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        <KebabMenu
                          actions={[
                            {
                              label: 'View Details',
                              icon: <Visibility />,
                              onClick: () => handleViewExpense(expense),
                            },
                            {
                              label: 'Edit Expense',
                              icon: <Edit />,
                              onClick: () => handleEditExpense(expense),
                              divider: true,
                            },
                            {
                              label: 'Delete Expense',
                              icon: <Delete />,
                              onClick: () => handleDeleteExpense(expense.id),
                              color: 'error',
                            },
                          ]}
                          tooltip="Expense actions"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Expense Dialog */}
      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Expense</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <Autocomplete
                fullWidth
                options={categories}
                getOptionLabel={(option) => option.name}
                value={categories.find(cat => cat.id === formData.category_id) || null}
                onChange={(_, value) => handleCategoryChange(value?.id || null)}
                loading={categoriesLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    required
                    helperText="Select an existing category or create a new one"
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2">{option.name}</Typography>
                        {option.description && (
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
              />
              <Tooltip title="Create New Category">
                <IconButton
                  color="primary"
                  onClick={handleCreateCategory}
                  sx={{ mb: 0.5 }}
                >
                  <AddCircle />
                </IconButton>
              </Tooltip>
            </Box>

            {!formData.category_id && (
              <TextField
                label="Custom Category Name"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                fullWidth
                helperText="Enter a custom category name if not using predefined categories"
              />
            )}
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitCreate}>
            Add Expense
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <Autocomplete
                fullWidth
                options={categories}
                getOptionLabel={(option) => option.name}
                value={categories.find(cat => cat.id === formData.category_id) || null}
                onChange={(_, value) => handleCategoryChange(value?.id || null)}
                loading={categoriesLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    required
                    helperText="Select an existing category or create a new one"
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2">{option.name}</Typography>
                        {option.description && (
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
              />
              <Tooltip title="Create New Category">
                <IconButton
                  color="primary"
                  onClick={handleCreateCategory}
                  sx={{ mb: 0.5 }}
                >
                  <AddCircle />
                </IconButton>
              </Tooltip>
            </Box>

            {!formData.category_id && (
              <TextField
                label="Custom Category Name"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                fullWidth
                helperText="Enter a custom category name if not using predefined categories"
              />
            )}
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitEdit}>
            Update Expense
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Expense Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Expense Details</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                  <Typography variant="body1">{selectedExpense.title}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                  <Chip label={selectedExpense.category} size="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(selectedExpense.amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{formatDate(selectedExpense.date)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">{selectedExpense.created_by?.name || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                  <Typography variant="body1">{formatDate(selectedExpense.created_at)}</Typography>
                </Box>
              </Box>
              {selectedExpense.description && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedExpense.description}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onClose={() => setIsCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Category />
            {selectedCategory ? 'Edit Category' : 'Create New Category'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Category Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              fullWidth
              required
              helperText="Enter a unique name for this category"
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              fullWidth
              helperText="Optional description to help identify this category"
            />

            {categories.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Existing Categories
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {categories.map((category) => (
                    <Box
                      key={category.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {category.name}
                        </Typography>
                        {category.description && (
                          <Typography variant="caption" color="text.secondary">
                            {category.description}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditCategory(category)}
                          color="primary"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCategory(category.id)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitCategory}
            disabled={!categoryFormData.name.trim()}
          >
            {selectedCategory ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseTab;
