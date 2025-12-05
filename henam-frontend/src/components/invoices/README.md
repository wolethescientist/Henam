# Job Selection Dialog

This component is used when an invoice payment triggers smart linking and multiple matching active jobs are found for the client.

## Usage

The `JobSelectionDialog` should be displayed when the invoice payment API returns `requires_job_selection: true` and includes a `matching_jobs` array.

### Integration Example

```typescript
import JobSelectionDialog from '../../components/invoices/JobSelectionDialog';
import { useLinkInvoiceToJobMutation } from '../../store/api/invoicesApi';

// In your component:
const [linkInvoiceToJob] = useLinkInvoiceToJobMutation();
const [showJobSelection, setShowJobSelection] = useState(false);
const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);

// When updating invoice payment:
const handleSubmitPayment = async () => {
  if (!selectedInvoice) return;
  
  try {
    const result = await updateInvoicePayment({ 
      id: selectedInvoice.id, 
      paid_amount: finalPaymentAmount 
    }).unwrap();
    
    // Check if job selection is required
    if (result.requires_job_selection && result.matching_jobs) {
      // Show job selection dialog
      setPendingInvoice(result);
      setShowJobSelection(true);
      setIsPaymentDialogOpen(false);
      return;
    }
    
    // Normal flow - payment updated successfully
    setIsPaymentDialogOpen(false);
    showSuccess('Payment updated successfully!');
    
  } catch (error) {
    console.error('Failed to update payment:', error);
    showError('Failed to update payment. Please try again.');
  }
};

// Handle job selection
const handleSelectJob = async (jobId: number) => {
  if (!pendingInvoice) return;
  
  try {
    await linkInvoiceToJob({
      invoice_id: pendingInvoice.id,
      job_id: jobId,
    }).unwrap();
    
    setShowJobSelection(false);
    setPendingInvoice(null);
    showSuccess('Invoice successfully linked to job!');
    
  } catch (error) {
    console.error('Failed to link invoice to job:', error);
    showError('Failed to link invoice to job. Please try again.');
  }
};

// Handle creating new job instead
const handleCreateNewJob = () => {
  setShowJobSelection(false);
  // Trigger normal job creation flow
  // The invoice will be converted to a new job automatically
  showSuccess('Creating new job from invoice...');
};

// Render the dialog
<JobSelectionDialog
  open={showJobSelection}
  matchingJobs={pendingInvoice?.matching_jobs || []}
  invoiceNumber={pendingInvoice?.invoice_number || ''}
  invoiceAmount={pendingInvoice?.amount || 0}
  clientName={pendingInvoice?.client_name || ''}
  onSelectJob={handleSelectJob}
  onCreateNew={handleCreateNewJob}
  onCancel={() => {
    setShowJobSelection(false);
    setPendingInvoice(null);
  }}
  isLinking={isLinking}
/>
```

## Props

- `open` (boolean): Controls dialog visibility
- `matchingJobs` (JobSummary[]): Array of matching active jobs
- `invoiceNumber` (string): Invoice number for display
- `invoiceAmount` (number): Invoice amount for display
- `clientName` (string): Client name for display
- `onSelectJob` (function): Callback when user selects a job - receives jobId
- `onCreateNew` (function): Callback when user chooses to create new job
- `onCancel` (function): Callback when user cancels the dialog
- `isLinking` (boolean, optional): Loading state during job linking

## Features

- **Search/Filter**: Users can search jobs by title, team, supervisor, or status
- **Job Preview**: Shows job details including progress, team, supervisor, and start date
- **Radio Selection**: Clear single-selection interface
- **Create New Option**: Allows users to create a new job if none match
- **Responsive Design**: Works well on all screen sizes

## Backend Integration

The backend returns this structure when multiple jobs are found:

```json
{
  "id": 123,
  "invoice_number": "INV-2024-0001",
  "client_name": "Acme Corp",
  "amount": 5000.00,
  "paid_amount": 5000.00,
  "status": "paid",
  "requires_job_selection": true,
  "matching_jobs": [
    {
      "id": 1,
      "title": "Website Redesign",
      "client": "Acme Corp",
      "status": "in_progress",
      "progress": 45,
      "team_name": "Development Team",
      "supervisor_name": "John Doe",
      "start_date": "2024-01-15T00:00:00"
    },
    {
      "id": 2,
      "title": "Mobile App Development",
      "client": "Acme Corp",
      "status": "not_started",
      "progress": 0,
      "team_name": "Mobile Team",
      "supervisor_name": "Jane Smith",
      "start_date": "2024-02-01T00:00:00"
    }
  ]
}
```

## API Endpoints Used

- `PATCH /invoices/{id}/payment` - Returns matching_jobs when multiple found
- `POST /invoices/{id}/link-to-job` - Links invoice to selected job
